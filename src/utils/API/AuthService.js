import axios from 'axios';
import {
  createNewObject,
  createNewObjectTarget,
  getAllBatchCohortIds,
  getDataFromStorage,
  getDefaultProgramTags,
  getTentantId,
  setDataInStorage,
} from '../JsHelper/Helper';
import {
  deleteData,
  getData,
  insertData,
  getDataOrderById,
} from '../JsHelper/SqliteHelper';
import EndUrls from './EndUrls';
import { get, handleResponseException, patch, post } from './RestClient';
//for react native config env : dev uat prod
import Config from 'react-native-config';
import RNFS from 'react-native-fs';
import { Alert } from 'react-native';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { TENANT_DATA } from '../Constants/app-constants';
import { mergeAttendanceLists } from '../Helper/AttendanceHelper';

const getHeaders = async () => {
  const token = await getDataFromStorage('Accesstoken');
  let tenantId = await getTentantId();

  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    tenantId: `${tenantId}`,
  };
};
const getHeaderswithoutTenant = async () => {
  const token = await getDataFromStorage('Accesstoken');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

export const login = async (params = {}) => {
  try {
    const url = `${EndUrls.login}`;

    // console.log('Calling login API...');
    // console.log(
    //   `curl -X POST ${url} \\\n` +
    //     `  -H "Content-Type: application/json" \\\n` +
    //     `  -H "Accept: application/json" \\\n` +
    //     `  -d '${JSON.stringify(params, null, 2)}'`
    // );

    const result = await post(url, params, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (result?.data) {
      return result?.data?.result;
    } else {
      return {};
    }
  } catch (e) {
    console.error('Login error:', e);
    // Return the failure reason so callers can tell wrong credentials apart
    // from other failures (CAPTCHA, server error, no network).
    return {
      error: true,
      status: e?.response?.status,
      params: e?.response?.data?.params,
    };
  }
};

export const refreshToken = async (params = {}) => {
  try {
    // Construct the cURL command
    const url = `${EndUrls.refresh_token}`;
    const headers = await getHeaders();
    const headersString = Object.entries(headers)
      .map(([key, value]) => `-H "${key}: ${value}"`)
      .join(' ');

    const dataString = JSON.stringify(params);
    const curlCommand = `curl -X POST ${headersString} -d '${dataString}' ${url}`;
    console.log('cURL command:', curlCommand);

    const result = await post(url, params, { headers });

    if (result?.data) {
      return result?.data?.result;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};

export const getAccessToken = async () => {
  try {
    const headers = await getHeaderswithoutTenant();
    const url = `${EndUrls.get_current_token}`;

    // Generate the `curl` command
    const curlCommand = [
      `curl -X GET '${url}'`,
      ...Object.entries(headers || {}).map(
        ([key, value]) => `-H '${key}: ${value}'`
      ),
    ].join(' ');

    // Log the `curl` command
    // console.log('CURL Command:', curlCommand);

    const result = await get(url, {
      headers: headers || {},
    });

    if (result) {
      return result?.data;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};

export const getStudentForm = async (tenantId) => {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(tenantId && { tenantId: `${tenantId}` }),
  };
  // const url = `${EndUrls.get_form}`;
  const url = `${EndUrls.get_form}`;
  const user_id = await getDataFromStorage('userId'); // Ensure this is defined
  // Common form and each tenant's program form share `url`, so the cache key
  // must include tenantId - otherwise they collide on the same cached row and
  // an offline fallback can return a different program's fields.
  const cacheKey = { tenantId: tenantId || 'common' };
  try {
    // Generate the curl command
    const curlCommand = `curl -X GET '${url}' \\
${Object.entries(headers || {})
  .map(([key, value]) => `-H '${key}: ${value}' \\`)
  .join('\n')}`;

    // console.log(curlCommand);

    // Make the API request
    const result = await get(url, {
      headers: headers || {},
    });

    if (result) {
      await storeApiResponse(user_id, url, 'get', cacheKey, result?.data?.result);
      return result?.data?.result;
    } else {
      const result_offline = await getApiResponse(user_id, url, 'get', cacheKey);
      return result_offline;
    }
  } catch (e) {
    const result_offline = await getApiResponse(user_id, url, 'get', cacheKey);
    return result_offline;
  }
};

export const userExist = async (payload) => {
  try {
    const curlCommand = `
    curl -X POST ${EndUrls.userExist} \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d '${JSON.stringify(payload)}'
  `.trim();

    // Log the cURL command
    console.log('cURL Command:', curlCommand);
    const result = await post(`${EndUrls.userExist}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (result?.data) {
      return result?.data;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};
export const sendOtp = async (payload) => {
  try {
    const curlCommand = `
      curl -X POST ${EndUrls.sendOTP} \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -d '${JSON.stringify(payload)}'
    `.trim();

    //   // Log the cURL command
    console.log('cURL Command:', curlCommand);
    const result = await post(`${EndUrls.sendOTP}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    console.log('########## otp sent', JSON.stringify(result));

    if (result?.data) {
      return result?.data;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};
export const verifyOtp = async (payload) => {
  try {
    const curlCommand = `
      curl -X POST ${EndUrls.verifyOTP} \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -d '${JSON.stringify(payload)}'
    `.trim();

    //   // Log the cURL command
    console.log('cURL Command:', curlCommand);
    const result = await post(`${EndUrls.verifyOTP}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (result?.data) {
      return result?.data;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};
export const suggestUsername = async (payload) => {
  try {
    const curlCommand = `
    //   curl -X POST ${EndUrls.suggestUsername} \
    //   -H "Content-Type: application/json" \
    //   -H "Accept: application/json" \
    //   -d '${JSON.stringify(payload)}'
    // `.trim();

    //   // Log the cURL command
    console.log('cURL Command:', curlCommand);
    const result = await post(`${EndUrls.suggestUsername}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (result?.data) {
      return result?.data;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};

export const registerUser = async (params = {}) => {
  try {
    const method = 'POST'; // Define the HTTP method
    const url = `${EndUrls.learner_register}`; // Define the URL
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    // Log the cURL command
    console.log(
      `curl -X ${method} ${url} -H 'Content-Type: application/json' -d '${JSON.stringify(
        params
      )}'`
    );

    // Make the actual request
    const result = await post(url, params, {
      headers: headers || {},
    });

    if (result?.data) {
      return result?.data;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};
export const updateUser = async ({ payload, user_id }) => {
  try {
    const method = 'PATCH'; // Define the HTTP method
    const url = `${EndUrls.update_profile}/${user_id}`; // Define the URL
    const token = await getDataFromStorage('Accesstoken');
    const headers = await getHeaders();

    const curlCommand = `
    curl -X PATCH '${url}' \\
    -H 'Content-Type: application/json' \\
    -H 'Accept: application/json' \\
    -H 'Authorization:  ${headers.Authorization}' \\
    -H 'tenantId: ${headers.tenantId}' \\
    -d '${JSON.stringify(payload)}'
        `;
    console.log('cURL Command:', curlCommand);

    // Make the actual request
    const result = await patch(url, payload, {
      headers: headers || {},
    });

    if (result?.data) {
      return result?.data;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};

export const courseListApi_testing = async ({
  searchText,
  inprogress_do_ids,
}) => {
  const tenantData = JSON.parse(await getDataFromStorage('tenantData'));
  const collectionFramework = tenantData?.[0]?.collectionFramework;
  const user_id = await getDataFromStorage('userId');
  const url = `${EndUrls.contentList_testing}${collectionFramework}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  let userType = await getDataFromStorage('userType');
  let uiConfig = {};
  try {
    uiConfig = JSON.parse((await getDataFromStorage('uiConfig')) || '{}');
  } catch (e) {
    console.log('Error parsing uiConfig:', e);
  }
  const payload = {
    request: {
      filters: {
        program:
          userType == 'scp'
            ? uiConfig?.program || (await getDefaultProgramTags())
            : ['Youthnet', 'youthnet', 'YouthNet', TENANT_DATA.YOUTHNET],
        ...(inprogress_do_ids && { identifier: inprogress_do_ids }),
        primaryCategory: ['Course'],
      },
      limit: 100,
      sort_by: {
        lastPublishedOn: 'desc',
      },
      ...(searchText && { query: searchText }),
      fields: [
        'name',
        'appIcon',
        'description',
        'posterImage',
        'mimeType',
        'identifier',
        'resourceType',
        'primaryCategory',
        'contentType',
        'trackable',
        'children',
        'leafNodes',
      ],
      facets: [
        'se_boards',
        'se_gradeLevels',
        'se_subjects',
        'se_mediums',
        'primaryCategory',
      ],
      offset: 0,
    },
  };

  // Generate cURL command
  const curlCommand = `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;

  console.log('Generated cURL Command:');
  console.log(curlCommand);

  try {
    const result = await post(url, payload, { headers });

    if (result) {
      await storeApiResponse(
        user_id,
        url,
        'post',
        payload,
        result?.data?.result
      );
      return result?.data?.result;
    } else {
      let result_offline = await getApiResponse(user_id, url, 'post', payload);
      return result_offline;
    }
  } catch (e) {
    let result_offline = await getApiResponse(user_id, url, 'post', payload);
    return result_offline;
  }
};

export const courseListApi_New = async ({
  searchText,
  mergedFilter,
  instant,
  offset,
  inprogress_do_ids,
  contentFilter,
  customProp = '',
}) => {
  const tenantData = JSON.parse(await getDataFromStorage('tenantData'));
  const channelId = tenantData?.[0]?.channelId;
  const collectionFramework = tenantData?.[0]?.collectionFramework;

  const user_id = await getDataFromStorage('userId');
  const url = `${EndUrls.contentList_testing}${collectionFramework}`; // Define the URL
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  let userType = await getDataFromStorage('userType');

  const payload = {
    request: {
      filters: {
        channel: instant?.channelId || channelId,
        // program:
        //   userType == 'scp'
        //     ? ['secondchance', 'Second Chance']
        //     : ['Youthnet', 'youthnet', 'YouthNet'],
        se_domains: contentFilter?.domain,
        program: contentFilter?.program,
        ...(inprogress_do_ids && { identifier: inprogress_do_ids }), // Add identifier conditionally
        status: ['Live'],
        primaryCategory:
          customProp === 'forchildren' ? ['Activity', 'Story'] : ['Course'],
        ...(mergedFilter && mergedFilter),
      },
      limit: 10,
      sort_by: {
        lastPublishedOn: 'desc',
      },
      ...(searchText && { query: searchText }), // Add query conditionally
      fields: [
        'name',
        'appIcon',
        'description',
        'posterImage',
        'mimeType',
        'identifier',
        'resourceType',
        'primaryCategory',
        'contentType',
        'trackable',
        'children',
        'leafNodes',
        'certificateTemplate',
      ],
      // facets: [
      //   'se_boards',
      //   'se_gradeLevels',
      //   'se_subjects',
      //   'se_mediums',
      //   'primaryCategory',
      // ],
      offset: offset ? offset : 0,
    },
  };
  // Construct the cURL command
  let curlCommand = `curl -X POST '${url}' \\\n`;
  for (const [key, value] of Object.entries(headers)) {
    curlCommand += `-H '${key}: ${value}' \\\n`;
  }
  curlCommand += `-d '${JSON.stringify(payload)}'`;

  // Output the cURL command to the console
  console.log('Equivalent cURL command:\n', curlCommand);
  try {
    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      // store result
      await storeApiResponse(
        user_id,
        url,
        'post',
        payload,
        result?.data?.result
      );
      return result?.data?.result;
    } else {
      let result_offline = await getApiResponse(user_id, url, 'post', payload);
      return result_offline;
    }
  } catch (e) {
    let result_offline = await getApiResponse(user_id, url, 'post', payload);
    return result_offline;
  }
};

export const profileCourseListApi = async () => {
  const user_id = await getDataFromStorage('userId');
  const url = `${EndUrls.getCourseCompletedList}`; // Define the URL
  let tenantId = await getTentantId();

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    tenantId: tenantId,
  };
  const payload = {
    filters: {
      // status: ['completed', 'viewCertificate'],
      // bug fix for invalid date and without certificate issue
      status: ['viewCertificate'],
      userId: user_id,
    },
    limit: 100,
    offset: 0,
  };
  // Construct the cURL command
  let curlCommand = `curl -X POST '${url}' \\\n`;
  for (const [key, value] of Object.entries(headers)) {
    curlCommand += `-H '${key}: ${value}' \\\n`;
  }
  curlCommand += `-d '${JSON.stringify(payload)}'`;

  // Output the cURL command to the console
  console.log('Equivalent cURL command:\n', curlCommand);
  try {
    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      // store result
      await storeApiResponse(
        user_id,
        url,
        'post',
        payload,
        result?.data?.result
      );
      return result?.data?.result;
    } else {
      let result_offline = await getApiResponse(user_id, url, 'post', payload);
      return result_offline;
    }
  } catch (e) {
    let result_offline = await getApiResponse(user_id, url, 'post', payload);
    return result_offline;
  }
};

export const contentListApi_Pratham = async ({
  searchText,
  // mergedFilter,
  instant,
  offset,
}) => {
  const tenantData = JSON.parse(await getDataFromStorage('tenantData'));
  const collectionFramework = tenantData?.[0]?.collectionFramework;
  const channelId = tenantData?.[0]?.channelId;
  const user_id = await getDataFromStorage('userId');
  const url = `${EndUrls.contentList}${collectionFramework}`; // Define the URL
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  let userType = await getDataFromStorage('userType');

  let payload = {
    request: {
      filters: {
        channel: channelId,

        primaryCategory: ['Learning Resource', 'Practice Question Set'],
        visibility: ['Default', 'Parent'],
      },
      limit: 10,
      sort_by: {
        lastPublishedOn: 'desc',
      },
      ...(searchText && { query: searchText }), // Add query conditionally
      fields: [
        'name',
        'appIcon',
        'description',
        'posterImage',
        'mimeType',
        'identifier',
        'resourceType',
        'primaryCategory',
        'contentType',
        'trackable',
        'children',
        'leafNodes',
      ],
      // facets: [
      //   'se_boards',
      //   'se_gradeLevels',
      //   'se_subjects',
      //   'se_mediums',
      //   'primaryCategory',
      // ],
      offset: offset ? offset : 0,
    },
  };

  //get language user
  //removed below filter for Pilot release
  /*const result = JSON.parse(await getDataFromStorage('profileData'));
  if (result?.getUserDetails?.[0]?.customFields?.[0]?.value) {
    let language = [result?.getUserDetails?.[0]?.customFields?.[0]?.value];
    payload.request.filters['se_mediums'] = language;
  }*/

  // Construct the cURL command
  let curlCommand = `curl -X POST '${url}' \\\n`;
  for (const [key, value] of Object.entries(headers)) {
    curlCommand += `-H '${key}: ${value}' \\\n`;
  }
  curlCommand += `-d '${JSON.stringify(payload)}'`;

  // Output the cURL command to the console
  console.log('Equivalent cURL command:\n', curlCommand);

  try {
    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });
    if (result) {
      // store result
      await storeApiResponse(
        user_id,
        url,
        'post',
        payload,
        result?.data?.result
      );
      return result?.data?.result;
    } else {
      let result_offline = await getApiResponse(user_id, url, 'post', payload);
      return result_offline;
    }
  } catch (e) {
    let result_offline = await getApiResponse(user_id, url, 'post', payload);
    return result_offline;
  }
};

export const getCohort = async ({ user_id, tenantid, academicYearId }) => {
  try {
    const token = await getDataFromStorage('Accesstoken');
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      tenantid: tenantid,
      academicyearid: academicYearId,
    };
    const url = `${EndUrls.cohort}/${user_id}`;

    // Log the curl command
    // console.log(
    //   `curl -X GET '${url}' -H 'Content-Type: application/json'${
    //     headers.Authorization
    //       ? ` -H 'Authorization: ${headers.Authorization}'`
    //       : ''
    //   }
    //   -H 'tenantid: ${headers.tenantid}'
    //   -H 'academicyearid: ${headers.academicyearid}'`
    // );

    const result = await get(url, {
      headers: headers || {},
    });

    if (result) {
      return result?.data?.result;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};

export const getProgramDetails = async () => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const url = `${EndUrls.tenantRead}`;

    // Log the curl command
    // console.log(
    //   `curl -X GET '${url}' -H 'Content-Type: application/json'${
    //     headers.Authorization
    //       ? ` -H 'Authorization: ${headers.Authorization}'`
    //       : ''
    //   }`
    // );

    const result = await get(url, {
      headers: headers || {},
    });

    if (result) {
      //before parent tenant change
      // return result?.data?.result;

      //parent tenant fix
      const currentOrigin = 'http://localhost:3002';
      const matchingTenants =
        result?.data?.result?.filter((tenant) =>
          tenant?.params?.uiConfig?.enable_domain?.includes(currentOrigin)
        ) || [];
      const programsData =
        matchingTenants.flatMap((t) => t?.children || []) || [];
      console.log('programsData', programsData);
      return programsData;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};

export const setAcademicYear = async ({ tenantid }) => {
  try {
    const token = await getDataFromStorage('Accesstoken');
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      tenantid: tenantid,
    };
    const url = `${EndUrls.academicyears}`;
    const payload = {
      isActive: true,
    };

    // Log the curl command

    // console.log(
    //   `curl -X POST '${url}' \\\n` +
    //     `-H 'Content-Type: application/json' \\\n` +
    //     `-H 'Accept: application/json' \\\n` +
    //     `-H 'Authorization: ${headers.Authorization}' \\\n` +
    //     `-H 'tenantid: ${headers.tenantid}' \\\n` +
    //     `-d '${JSON.stringify(payload)}'`
    // );

    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      return result?.data?.result;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};
export const getAcademicYearList = async ({ tenantid }) => {
  try {
    const token = await getDataFromStorage('Accesstoken');
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      tenantid: tenantid,
    };
    const url = `${EndUrls.academicyears}`;
    // const payload = {
    //   isActive: true,
    // };

    // Log the curl command

    // console.log(
    //   `curl -X POST '${url}' \\\n` +
    //     `-H 'Content-Type: application/json' \\\n` +
    //     `-H 'Accept: application/json' \\\n` +
    //     `-H 'Authorization: ${headers.Authorization}' \\\n` +
    //     `-H 'tenantid: ${headers.tenantid}' \\\n` +
    //     `-d '${JSON.stringify(payload)}'`
    // );

    const result = await post(url, {}, {
      headers: headers || {},
    });

    if (result) {
      return result?.data?.result;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};
// Assessment List API

export const assessmentListApi = async (params = {}) => {
  const user_id = params?.user_id;
  const url = `${EndUrls.contentSearch}`; // Define the URL
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  let userType = await getDataFromStorage('userType');
  let uiConfig = {};
  try {
    uiConfig = JSON.parse((await getDataFromStorage('uiConfig')) || '{}');
  } catch (e) {
    console.log('Error parsing uiConfig:', e);
  }
  const payload = {
    request: {
      filters: {
        program:
          userType == 'scp'
            ? uiConfig?.program || (await getDefaultProgramTags())
            : [TENANT_DATA.YOUTHNET],
        board: `${params?.boardName}`,
        // "se_boards": [`${params?.boardName}`],

        // board: `Maharashtra Education Board`,
        // state: `${params?.stateName}`,
        // assessmentType: ['pre-test', 'post-test'],
        assessmentType: [
          'Pre Test',
          'Post Test',
          'Other',
          'Unit Test',
          'Mock Test',
        ],
        status: ['Live'],
        primaryCategory: ['Practice Question Set'],
        // new different type
        // undo this
        evaluationType: ['offline', 'online', 'ai'],
        // Only assessments tagged with the learner's batch stream(s)
        ...(params?.streams?.length && { stream: params.streams }),
      },
      sort_by: {
        lastUpdatedOn: 'desc',
      },
      query: '',
      limit: 100,
      offset: 0,
    },
  };
  try {
    const curlCommand = `
curl -X POST '${url}' \\
-H 'Content-Type: application/json' \\
-H 'Accept: application/json' \\
-d '${JSON.stringify(payload)}'
    `;
    console.log('CURL Command:\n', curlCommand); // Log the generated curl command

    // Make the actual request
    const result = await post(url, payload, {
      params: {
        orgdetails: 'orgName,email',
        licenseDetails: 'name,description,url',
      },
      headers: headers || {},
    });
    if (result) {
      //store result
      await storeApiResponse(
        user_id,
        url,
        'post',
        payload,
        result?.data?.result
      );
      return result?.data?.result;
    } else {
      let result_offline = await getApiResponse(user_id, url, 'post', payload);
      return result_offline;
    }
  } catch (e) {
    let result_offline = await getApiResponse(user_id, url, 'post', payload);
    return result_offline;
  }
};
export const getDoits = async ({ payload }) => {
  const user_id = await getDataFromStorage('userId');
  const url = `${EndUrls.contentSearch}`; // Define the URL
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // Construct curl command
  const curlCommand = `curl -X POST '${url}' -H 'Content-Type: application/json' -H 'Accept: application/json' -d '${JSON.stringify(
    payload
  )}'`;
  // console.log('Curl Command:', curlCommand);

  try {
    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });
    if (result) {
      //store result
      await storeApiResponse(
        user_id,
        url,
        'post',
        payload,
        result?.data?.result
      );
      return result?.data?.result;
    } else {
      let result_offline = await getApiResponse(user_id, url, 'post', payload);
      return result_offline;
    }
  } catch (e) {
    let result_offline = await getApiResponse(user_id, url, 'post', payload);
    return result_offline;
  }
};

//sync course details get
export const syncCourseDetails = async (courseId) => {
  const url = `${EndUrls.contentSearch}`; // Define the URL
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const payload = {
    request: {
      filters: {
        identifier: courseId,
      },
      fields: [
        'name',
        'englishName',
        'appIcon',
        'description',
        'posterImage',
        'mimeType',
        'identifier',
        'resourceType',
        'primaryCategory',
        'contentType',
        'trackable',
        'children',
        'leafNodes',
      ],
      limit: 1,
      offset: 0,
    },
  };
  try {
    const curlCommand = `
curl -X POST '${url}' \\
-H 'Content-Type: application/json' \\
-H 'Accept: application/json' \\
-d '${JSON.stringify(payload)}'
    `;
    // console.log('CURL Command:\n', curlCommand); // Log the generated curl command

    // Make the actual request
    const result = await post(url, payload, {
      params: {
        orgdetails: 'orgName,email',
        licenseDetails: 'name,description,url',
      },
      headers: headers || {},
    });
    if (result && result?.data?.result?.content?.length > 0) {
      return result?.data?.result?.content[0] || null;
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
};

export const trackAssessment = async (params = {}) => {
  try {
    const url = `${EndUrls.trackAssessment}`; // Define the URL
    const headers = await getHeaders();
    const payload = {
      filters: {
        userId: params?.user_id,
        // ...(params?.contentId && { contentId: 'do_1140753589854208001135' }),
      },
      sort: {
        field: 'userId',
        order: 'asc',
      },
    };

    // console.log(
    //   `curl -X POST ${url} -H 'Content-Type: application/json' -H 'Authorization: ${headers.Authorization}' -d '${JSON.stringify(payload)}'`
    // );

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      return result?.data?.result;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};
export const getProfileDetails = async (params = {}) => {
  const user_id = await getDataFromStorage('userId'); // Ensure this is defined
  const url = `${EndUrls.profileDetails}`; // Define the URL
  const headers = await getHeaders();
  const payload = {
    limit: 0,
    filters: {
      userId: params?.userId,
    },
    sort: ['createdAt', 'asc'],
    offset: 0,
  };
  try {
    // Convert headers object to cURL header format
    const headerString = Object.entries(headers || {})
      .map(([key, value]) => `-H "${key}: ${value}"`)
      .join(' ');

    // Convert payload to JSON string
    const payloadString = JSON.stringify(payload);

    // Construct cURL command
    const curlCommand = `curl -X POST "${url}" ${headerString} -H "Content-Type: application/json" -d '${payloadString}'`;

    console.log('#### loginmultirole Generated cURL Command:', curlCommand);

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });
    console.log('#### loginmultirole profileData result', result);
    if (result) {
      await storeApiResponse(
        user_id,
        url,
        'post',
        payload,
        result?.data?.result
      );
      return result?.data?.result;
    } else {
      const result_offline = await getApiResponse(
        user_id,
        url,
        'post',
        payload
      );
      return result_offline;
    }
  } catch (e) {
    const result_offline = await getApiResponse(user_id, url, 'post', payload);
    return result_offline;
  }
};

export const getUserDetails = async (params = {}) => {
  try {
    const url = `${EndUrls.userDetails}/${params?.user_id}`; // Define the URL
    const headers = await getHeaders();
    const result = await get(url, {
      headers: headers || {},
    });
    if (result) {
      return result?.data?.result;
    } else {
      return {};
    }
  } catch (e) {
    console.log(e);
  }
};

export const getAssessmentStatus = async (params = {}) => {
  const url = `${EndUrls.AssessmentStatus}`; // Define the URL
  const payload = {
    userId: [params?.user_id],
    courseId: params?.uniqueAssessmentsId,
    unitId: params?.uniqueAssessmentsId,
    contentId: params?.uniqueAssessmentsId,
  };

  try {

    const headers = await getHeaders();

    const curlCommand = `curl -X POST '${url}' \\ 
    ${Object.entries(headers || {})
      .map(([key, value]) => `  -H '${key}: ${value}' \\`)
      .join('\n')} 
      -d '${JSON.stringify(payload)}'`;

    console.log('#########atm do_ids cURL Command:', curlCommand);

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result?.data) {
      await storeApiResponse(
        params?.user_id,
        url,
        'post',
        payload,
        result?.data?.data
      );
      return result?.data?.data;
    } else {
      return {};
    }
  } catch (e) {
    // console.log("error outer",e);
    try{
      let result_offline = await getApiResponse(params?.user_id, url, 'post', payload);
      return result_offline;
    }
    catch (e) {
      // console.log("error",e);
      return handleResponseException(e);
    }
  }
};

export const getAssessmentStatusSync = async (payload) => {
  try {
    const url = `${EndUrls.AssessmentStatus}`; // Define the URL

    const headers = await getHeaders();

    const curlCommand = `curl -X POST '${url}' \\ 
    ${Object.entries(headers || {})
      .map(([key, value]) => `  -H '${key}: ${value}' \\`)
      .join('\n')} 
      -d '${JSON.stringify(payload)}'`;

    console.log('#########atm do_ids cURL Command:', curlCommand);

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result?.data) {
      return result?.data;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};
export const getAssessmentAnswerKey = async (params = {}) => {
  try {
    const url = `${EndUrls.AssessmentSearch}`; // Define the URL

    const headers = await getHeaders();

    const payload = {
      userId: params?.user_id,
      contentId: params?.contentId,
      courseId: params?.contentId,
      unitId: params?.contentId,
    };

    // console.log(
    //   `curl -X POST ${url} -H 'Content-Type: application/json' -H 'Authorization: ${headers.Authorization}' -d '${JSON.stringify(payload)}'`
    // );

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result?.data) {
      return result?.data?.data;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};

//store all api response in offline storage
export const storeApiResponse = async (
  user_id,
  api_url,
  api_type,
  payload,
  response
) => {
  try {
    //delete if exist to overwrite
    const data_delete = {
      user_id: user_id,
      api_url: api_url,
      api_type: api_type,
      payload: JSON.stringify(payload),
    };
    await deleteData({
      tableName: 'APIResponses',
      where: data_delete,
    })
      .then((msg) => console.log())
      .catch((err) => console.error());
    //store or overwrite
    const data_insert = {
      user_id: user_id,
      api_url: api_url,
      api_type: api_type,
      payload: JSON.stringify(payload),
      response: JSON.stringify(response),
    };
    // console.log('data_insert===>', JSON.stringify(data_insert));

    await insertData({
      tableName: 'APIResponses',
      data: data_insert,
    })
      .then((msg) => console.log('msg', msg))
      .catch((err) => console.error('err', err));
  } catch (e) {
    console.log(e);
  }
};

export const getApiResponse = async (user_id, api_url, api_type, payload) => {
  try {
    //get result
    const data_get = {
      user_id: user_id,
      api_url: api_url,
      api_type: api_type,
      payload: JSON.stringify(payload),
    };
    let result_data = null;
    // console.log('data_get===>', JSON.stringify(data_get));

    await getData({
      tableName: 'APIResponses',
      where: data_get,
    })
      .then((rows) => {
        if (rows.length > 0) {
          try {
            result_data = JSON.parse(rows[0]?.response);
          } catch (e) {
            console.log('e', e);
          }
        }
      })
      .catch((err) => {
        console.error('err', err);
      });
    return result_data;
  } catch (e) {
    console.log(e);
    return null;
  }
};

//store assessment offline
export const storeAsessmentOffline = async (user_id, content_id, payload) => {
  try {
    //delete if exist to overwrite
    const data_delete = {
      user_id: user_id,
      content_id: content_id,
    };
    await deleteData({
      tableName: 'Asessment_Offline_2',
      where: data_delete,
    })
      .then((msg) => console.log())
      .catch((err) => console.error());
    //store or overwrite
    const data_insert = {
      user_id: user_id,
      content_id: content_id,
      payload: JSON.stringify(payload),
    };
    await insertData({
      tableName: 'Asessment_Offline_2',
      data: data_insert,
    })
      .then((msg) => console.log())
      .catch((err) => console.error());
  } catch (e) {
    console.log(e);
  }
};
export const deleteAsessmentOffline = async (user_id, content_id) => {
  try {
    //delete if exist to overwrite
    const data_delete = {
      user_id: user_id,
      content_id: content_id,
    };
    await deleteData({
      tableName: 'Asessment_Offline_2',
      where: data_delete,
    })
      .then((msg) => console.log())
      .catch((err) => console.error());
  } catch (e) {
    console.log(e);
  }
};
export const getAsessmentOffline = async (user_id, content_id) => {
  try {
    //get result
    const data_get = {
      user_id: user_id,
      content_id: content_id,
    };
    let result_data = null;
    await getData({
      tableName: 'Asessment_Offline_2',
      where: data_get,
    })
      .then((rows) => {
        if (rows.length > 0) {
          try {
            result_data = JSON.parse(rows[0]?.payload);
          } catch (e) {}
        }
      })
      .catch((err) => {
        console.error('err', err);
      });
    return result_data;
  } catch (e) {
    console.log(e);
    return null;
  }
};
export const getSyncAsessmentOffline = async (user_id) => {
  try {
    //get result
    const data_get = {
      user_id: user_id,
    };
    let result_data = null;
    await getData({
      tableName: 'Asessment_Offline_2',
      where: data_get,
    })
      .then((rows) => {
        if (rows.length > 0) {
          try {
            result_data = rows;
          } catch (e) {}
        }
      })
      .catch((err) => {
        console.error('err', err);
      });
    return result_data;
  } catch (e) {
    console.log(e);
    return null;
  }
};
//store TenantAssessment
export const storeTenantAssessment = async (user_id, content_id, tenant_id) => {
  try {
    //delete if exist to overwrite
    const data_delete = {
      user_id: user_id,
      content_id: content_id,
      tenant_id: tenant_id,
    };
    await deleteData({
      tableName: 'TenantAssessment',
      where: data_delete,
    })
      .then((msg) => console.log())
      .catch((err) => console.error());
    //store or overwrite
    const data_insert = {
      user_id: user_id,
      content_id: content_id,
      tenant_id: tenant_id,
    };
    await insertData({
      tableName: 'TenantAssessment',
      data: data_insert,
    })
      .then((msg) => console.log())
      .catch((err) => console.error());
  } catch (e) {
    console.log(e);
  }
};
export const getTenantAssessment = async (user_id, content_id, tenant_id) => {
  try {
    //get result
    const data_get = {
      user_id: user_id,
      content_id: content_id,
      tenant_id: tenant_id,
    };
    let result_data = null;
    await getData({
      tableName: 'TenantAssessment',
      where: data_get,
    })
      .then((rows) => {
        if (rows.length > 0) {
          try {
            result_data = rows[0];
          } catch (e) {}
        }
      })
      .catch((err) => {
        console.error('err', err);
      });
    return result_data;
  } catch (e) {
    console.log(e);
    return null;
  }
};
//telemetry offline
//store
export const storeTelemetryOffline = async (user_id, telemetry_object) => {
  try {
    //store
    const data_insert = {
      user_id: user_id,
      telemetry_object: JSON.stringify(telemetry_object),
    };
    await insertData({
      tableName: 'Telemetry_Offline',
      data: data_insert,
    })
      .then((msg) => console.log())
      .catch((err) => console.error());
  } catch (e) {
    console.log(e);
  }
};
export const getSyncTelemetryOffline = async (user_id) => {
  try {
    //get result
    const data_get = {
      user_id: user_id,
    };
    let result_data = null;
    await getData({
      tableName: 'Telemetry_Offline',
      where: data_get,
    })
      .then((rows) => {
        if (rows.length > 0) {
          try {
            result_data = rows;
          } catch (e) {}
        }
      })
      .catch((err) => {
        console.error('err', err);
      });
    return result_data;
  } catch (e) {
    return null;
  }
};
export const deleteTelemetryOffline = async (id) => {
  try {
    //delete if exist to overwrite
    const data_delete = {
      id: id,
    };
    //console.log('data_delete', data_delete);
    await deleteData({
      tableName: 'Telemetry_Offline',
      where: data_delete,
    })
      .then((msg) => console.log())
      .catch((err) => console.error());
  } catch (e) {
    console.log(e);
  }
};
//tracking offline
//store
export const storeTrackingOffline = async (
  user_id,
  course_id,
  content_id,
  content_type,
  content_mime,
  lastAccessOn,
  detailsObject,
  unit_id
) => {
  try {
    //store
    const data_insert = {
      user_id: user_id,
      course_id: course_id,
      content_id: content_id,
      content_type: content_type,
      content_mime: content_mime,
      lastAccessOn: lastAccessOn,
      detailsObject: JSON.stringify(detailsObject),
      unit_id: unit_id,
    };
    await insertData({
      tableName: 'Tracking_Offline_2',
      data: data_insert,
    })
      .then((msg) => console.log())
      .catch((err) => console.error());
  } catch (e) {
    console.log(e);
  }
};
export const getSyncTrackingOffline = async (user_id) => {
  try {
    //get result
    const data_get = {
      user_id: user_id,
    };
    let result_data = null;
    await getData({
      tableName: 'Tracking_Offline_2',
      where: data_get,
    })
      .then((rows) => {
        //console.log('rows', rows);
        if (rows.length > 0) {
          try {
            result_data = rows;
          } catch (e) {}
        }
      })
      .catch((err) => {
        console.error('err', err);
      });
    return result_data;
  } catch (e) {
    console.log(e);
    return null;
  }
};
export const getSyncTrackingOfflineOrderById = async (user_id) => {
  try {
    //get result
    const data_get = {
      user_id: user_id,
    };
    let result_data = null;
    await getDataOrderById({
      tableName: 'Tracking_Offline_2',
      where: data_get,
      orderBy: 'order by id ASC',
    })
      .then((rows) => {
        //console.log('rows', rows);
        if (rows.length > 0) {
          try {
            result_data = rows;
          } catch (e) {}
        }
      })
      .catch((err) => {
        console.error('err', err);
      });
    return result_data;
  } catch (e) {
    console.log(e);
    return null;
  }
};
export const deleteTrackingOffline = async (id) => {
  try {
    //delete if exist to overwrite
    const data_delete = {
      id: id,
    };
    await deleteData({
      tableName: 'Tracking_Offline_2',
      where: data_delete,
    })
      .then((msg) => console.log())
      .catch((err) => console.error());
  } catch (e) {
    console.log(e);
  }
};
export const getSyncTrackingOfflineCourse = async (user_id, course_id) => {
  try {
    //get result
    const data_get = {
      user_id: user_id,
      course_id: course_id,
    };
    let result_data = null;
    await getData({
      tableName: 'Tracking_Offline_2',
      where: data_get,
    })
      .then((rows) => {
        if (rows.length > 0) {
          try {
            result_data = rows;
          } catch (e) {}
        }
      })
      .catch((err) => {
        console.error('err', err);
      });
    return result_data;
  } catch (e) {
    console.log(e);
    return null;
  }
};

export const getGeoLocation = async ({ payload }) => {
  try {
    const url = `${EndUrls.geolocation}`; // Define the URL
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    console.log(
      `curl -X POST ${url} -H 'Content-Type: application/json' -H -d '${JSON.stringify(
        payload
      )}'`
    );

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      return result?.data?.result;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};
export const forgotPassword = async ({ payload }) => {
  try {
    const url = `${EndUrls.forgotPassword}`; // Define the URL
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    // console.log(
    //   `curl -X POST ${url} -H 'Content-Type: application/json' -H -d '${JSON.stringify(
    //     payload
    //   )}'`
    // );

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      return result?.data?.result;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};
export const resetPassword = async ({ payload }) => {
  try {
    const url = `${EndUrls.resetPassword}`; // Define the URL
    const headers = await getHeaders();

    const curlCommand = `
    curl -X POST '${url}' \\
    -H 'Content-Type: application/json' \\
    -H 'Accept: application/json' \\
    -H 'Authorization:  ${headers.Authorization}' \\
    -H 'tenantId: ${headers.tenantId}' \\
    -d '${JSON.stringify(payload)}'
        `;
    // console.log('cURL Command:', curlCommand);

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      return result?.data?.result;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};

export async function reverseGeocode(latitude, longitude) {
  const GOOGLE_KEY = Config.GOOGLE_KEY;

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_KEY}`
  );

  const data = await response.json();
  if (data.results.length > 0) {
    const addressComponents = data.results[0].address_components;
    const state = addressComponents.find((comp) =>
      comp.types.includes('administrative_area_level_1')
    )?.long_name;
    const district = addressComponents.find((comp) =>
      comp.types.includes('administrative_area_level_3')
    )?.long_name;
    const block = addressComponents.find((comp) =>
      comp.types.includes('sublocality')
    )?.long_name;
    return { state, district, block };
  }
  return { state: null, district: null, block: null };
}

export const eventList = async ({ startDate, endDate }) => {
  const user_id = await getDataFromStorage('userId'); // Ensure this is defined
  const url = `${EndUrls.eventList}`; // Define the URL
  const headers = await getHeaders();
  const academicYearId = await getDataFromStorage('academicYearId');
  const cohort = JSON.parse((await getDataFromStorage('cohortData')) || 'null');
  const payload = {
    limit: 0,
    offset: 0,
    filters: {
      // cohortData holds the learner's active BATCH cohort, so this scopes
      // events to their own batch only. Omitted entirely when no batch is
      // selected, so the server never receives [null].
      ...(cohort?.cohortId ? { cohortIds: [cohort.cohortId] } : {}),
      startDate: {
        after: startDate,
      },
      endDate: {
        before: endDate,
      },
      status: ['live'],
    },
  };
  
  try {
    // const curlCommand = `
    // curl -X POST '${url}' \\
    // -H 'Content-Type: application/json' \\
    // -H 'Accept: application/json' \\
    // -H 'Authorization:  ${headers.Authorization}' \\
    // -H 'tenantId: ${headers.tenantId}' \\
    // -d '${JSON.stringify(payload)}'
    //     `;
    // console.log('cURL Command_Event:', curlCommand);

    // Make the actual request
    const result = await post(url, payload, {
      headers: { ...headers, academicyearid: academicYearId },
    });

    if (result) {
      await storeApiResponse(
        user_id,
        url,
        'post',
        payload,
        result?.data?.result
      );
      return result?.data?.result;
    } else {
      let result_offline = await getApiResponse(user_id, url, 'post', payload);
      return result_offline;
    }
  } catch (e) {
    let result_offline = await getApiResponse(user_id, url, 'post', payload);
    return result_offline;
  }
};
export const targetedSolutions = async ({ subjectName, type,academicYear="" }) => {
  const user_id = await getDataFromStorage('userId'); // Ensure this is defined
  const url = `${EndUrls.targetedSolutions}`; // Define the URL
  const method = 'POST'; // Define the HTTP method
  const token = await getDataFromStorage('Accesstoken');
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Cookie:
      'AWSALB=QVc9G+7LKggb8zF3qcLslwzgKzrKMO8SR2IhHCuIOYqAWLb7Z8j/dQsgOgAcWzoHng47JkYeBVsERcq2LH1Uqrcw371BlDe3KXU84ewyOlTU2Gxi9KwnIGIRKHW+; AWSALBCORS=QVc9G+7LKggb8zF3qcLslwzgKzrKMO8SR2IhHCuIOYqAWLb7Z8j/dQsgOgAcWzoHng47JkYeBVsERcq2LH1Uqrcw371BlDe3KXU84ewyOlTU2Gxi9KwnIGIRKHW+',
    'x-auth-token': token,
  };
  const cohort = JSON.parse((await getDataFromStorage('cohortData')) || 'null');
  // console.log('cohort==>', JSON.stringify(cohort));

  const requiredLabels = ['GRADE', 'STATES', 'MEDIUM', 'BOARD'];
  const customFields = cohort?.customField;
  const data = createNewObjectTarget(customFields, requiredLabels);
  // console.log('data==>', JSON.stringify(data));

  const payload = {
    subject: subjectName,
    // state: data?.STATES,
    medium: data?.MEDIUM?.value,
    class: data?.GRADE?.value,
    board: data?.BOARD?.value,
    courseType: type,
    ...(academicYear ? { academicYear } : {}),
  };
  try {
    console.log(
      `curl -X ${method} '${url}' -H 'Content-Type: application/json' -H 'x-auth-token: ${
        headers['x-auth-token']
      }' -d '${JSON.stringify(payload)}'`
    );

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      await storeApiResponse(
        user_id,
        url,
        'post',
        payload,
        result?.data?.result
      );
      return result?.data?.result;
    } else {
      let result_offline = await getApiResponse(user_id, url, 'post', payload);

      return result_offline;
    }
  } catch (e) {
    let result_offline = await getApiResponse(user_id, url, 'post', payload);

    return result_offline;
  }
};
export const EventDetails = async ({ id }) => {
  const url = `${EndUrls.EventDetails}/${id}`; // Define the URL
  const user_id = await getDataFromStorage('userId'); // Ensure this is defined
  const payload = {};
  const method = 'POST'; // Define the HTTP method
  const token = await getDataFromStorage('Accesstoken');
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Cookie:
      'AWSALB=QVc9G+7LKggb8zF3qcLslwzgKzrKMO8SR2IhHCuIOYqAWLb7Z8j/dQsgOgAcWzoHng47JkYeBVsERcq2LH1Uqrcw371BlDe3KXU84ewyOlTU2Gxi9KwnIGIRKHW+; AWSALBCORS=QVc9G+7LKggb8zF3qcLslwzgKzrKMO8SR2IhHCuIOYqAWLb7Z8j/dQsgOgAcWzoHng47JkYeBVsERcq2LH1Uqrcw371BlDe3KXU84ewyOlTU2Gxi9KwnIGIRKHW+',
    'x-auth-token': token,
  };

  try {
    console.log(
      `curl -X ${method} '${url}' -H 'Content-Type: application/json' -H 'x-auth-token: ${
        headers['x-auth-token']
      }' -d '${JSON.stringify(payload)}'`
    );

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      await storeApiResponse(
        user_id,
        url,
        'post',
        payload,
        result?.data?.result
      );
      return result?.data?.result;
    } else {
      let result_offline = await getApiResponse(user_id, url, 'post', payload);
      return result_offline;
    }
  } catch (e) {
    let result_offline = await getApiResponse(user_id, url, 'post', payload);
    return result_offline;
  }
};
export const SolutionEvent = async ({ solutionId }) => {
  try {
    const method = 'POST'; // Define the HTTP method
    const url = `${EndUrls.SolutionEvent}/${solutionId}`; // Define the URL
    const token = await getDataFromStorage('Accesstoken');
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Cookie:
        'AWSALB=QVc9G+7LKggb8zF3qcLslwzgKzrKMO8SR2IhHCuIOYqAWLb7Z8j/dQsgOgAcWzoHng47JkYeBVsERcq2LH1Uqrcw371BlDe3KXU84ewyOlTU2Gxi9KwnIGIRKHW+; AWSALBCORS=QVc9G+7LKggb8zF3qcLslwzgKzrKMO8SR2IhHCuIOYqAWLb7Z8j/dQsgOgAcWzoHng47JkYeBVsERcq2LH1Uqrcw371BlDe3KXU84ewyOlTU2Gxi9KwnIGIRKHW+',
      'x-auth-token': token,
    };

    const payload = { role: 'Teacher' };

    // console.log(
    //   `curl -X ${method} '${url}' -H 'Content-Type: application/json' -H 'x-auth-token: ${
    //     headers['x-auth-token']
    //   }' -d '${JSON.stringify(payload)}'`
    // );

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      return result?.data?.result;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};
export const SolutionEventDetails = async ({ templateId, solutionId }) => {
  try {
    const method = 'POST'; // Define the HTTP method
    const url = `${EndUrls.EventDetails}?templateId=${templateId}&solutionId=${solutionId}`; // Define the URL
    const token = await getDataFromStorage('Accesstoken');
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Cookie:
        'AWSALB=QVc9G+7LKggb8zF3qcLslwzgKzrKMO8SR2IhHCuIOYqAWLb7Z8j/dQsgOgAcWzoHng47JkYeBVsERcq2LH1Uqrcw371BlDe3KXU84ewyOlTU2Gxi9KwnIGIRKHW+; AWSALBCORS=QVc9G+7LKggb8zF3qcLslwzgKzrKMO8SR2IhHCuIOYqAWLb7Z8j/dQsgOgAcWzoHng47JkYeBVsERcq2LH1Uqrcw371BlDe3KXU84ewyOlTU2Gxi9KwnIGIRKHW+',
      'x-auth-token': token,
    };

    const payload = { role: 'Teacher' };

    // console.log(
    //   `curl -X ${method} '${url}' -H 'Content-Type: application/json' -H 'x-auth-token: ${
    //     headers['x-auth-token']
    //   }' -d '${JSON.stringify(payload)}'`
    // );

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      return result?.data?.result;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};

const PLACEHOLDER_COHORT_ID = '00000000-0000-0000-0000-000000000000';
const ATTENDANCE_COHORT_CACHE_KEY = 'attendanceCohortIds';
// The learner's batch history only changes when they are reassigned, so a few
// hours of staleness is harmless and keeps the dashboard off two extra API
// calls per screen focus. A reassignment also changes the stored cohortId,
// which invalidates the cache immediately regardless of age.
const ATTENDANCE_COHORT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Every batch the learner has been a member of in the current program, current
// one first. Attendance rows stay attached to the batch they were marked in, so
// this is the set of contextIds that together make up the learner's overall
// attendance record. Falls back to the cache (then to the current batch alone)
// when the cohort APIs can't be reached, so an offline learner never silently
// drops their history.
export const getLearnerBatchCohortIds = async ({
  forceRefresh = false,
} = {}) => {
  const currentCohortId = await getDataFromStorage('cohortId');
  const activeCohortId =
    currentCohortId && currentCohortId !== PLACEHOLDER_COHORT_ID
      ? currentCohortId
      : null;

  const withCurrentFirst = (ids) => {
    const merged = [activeCohortId, ...(ids || [])].filter(Boolean);
    return Array.from(new Set(merged));
  };

  let cached = null;
  try {
    cached = JSON.parse(
      (await getDataFromStorage(ATTENDANCE_COHORT_CACHE_KEY)) || 'null'
    );
  } catch (e) {
    cached = null;
  }

  const cacheIsUsable =
    cached?.cohortIds?.length &&
    cached?.currentCohortId === (activeCohortId || null);

  if (
    !forceRefresh &&
    cacheIsUsable &&
    Date.now() - (cached?.fetchedAt || 0) < ATTENDANCE_COHORT_CACHE_TTL_MS
  ) {
    return withCurrentFirst(cached.cohortIds);
  }

  try {
    const user_id = await getDataFromStorage('userId');
    const tenantid = await getTentantId();
    if (!user_id || !tenantid) {
      return withCurrentFirst(cacheIsUsable ? cached.cohortIds : []);
    }

    // A reassignment can also cross academic years, so every year the program
    // has is walked, not just the active one.
    const academicYears = (await getAcademicYearList({ tenantid })) || [];
    const academicYearIds = Array.isArray(academicYears)
      ? academicYears.map((item) => item?.id).filter(Boolean)
      : [];

    if (academicYearIds.length === 0) {
      return withCurrentFirst(cacheIsUsable ? cached.cohortIds : []);
    }

    const cohortIds = [];
    for (const academicYearId of academicYearIds) {
      const cohortResult = await getCohort({
        user_id,
        tenantid,
        academicYearId,
      });

      if (cohortResult?.params?.status === 'failed') continue;
      cohortIds.push(...getAllBatchCohortIds(cohortResult));
    }

    const resolved = withCurrentFirst(cohortIds);

    if (resolved.length > 0) {
      await setDataInStorage(
        ATTENDANCE_COHORT_CACHE_KEY,
        JSON.stringify({
          currentCohortId: activeCohortId || null,
          cohortIds: resolved,
          fetchedAt: Date.now(),
        })
      );
    }

    return resolved;
  } catch (e) {
    console.log('getLearnerBatchCohortIds failed', e);
    return withCurrentFirst(cacheIsUsable ? cached.cohortIds : []);
  }
};

// One attendance/list call for a single batch. Keeps the per-payload offline
// cache the screen relied on before, so each batch's rows survive going offline
// independently of the others.
const getAttendanceForCohort = async ({
  cohortId,
  userId,
  todate,
  fromDate,
  headers,
}) => {
  const url = `${EndUrls.attendance}`;

  const payload = {
    limit: 300,
    page: 0,
    filters: {
      context: 'cohort',
      contextId: cohortId,
      scope: 'Learner',
      toDate: todate,
      fromDate: fromDate,
      userId: userId,
    },
  };

  try {
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      await storeApiResponse(userId, url, 'post', payload, result?.data?.data);
      return result?.data?.data;
    }

    return await getApiResponse(userId, url, 'post', payload);
  } catch (e) {
    return await getApiResponse(userId, url, 'post', payload);
  }
};

export const getAttendance = async ({ todate, fromDate, cohortIds }) => {
  const userId = await getDataFromStorage('userId');
  const headers = await getHeaders();

  // Attendance is stored against the batch it was marked in. Asking only for
  // the learner's current batch is what made a reassigned learner read as 0% -
  // every batch they have belonged to is asked for instead.
  const batchIds = cohortIds?.length
    ? cohortIds
    : await getLearnerBatchCohortIds();

  const idsToQuery = (batchIds || []).filter(
    (id) => id && id !== PLACEHOLDER_COHORT_ID
  );

  // The learner isn't in any batch yet - an empty record, not a failed read.
  if (idsToQuery.length === 0) {
    return { attendanceList: [], totalCount: 0 };
  }

  const responses = await Promise.all(
    idsToQuery.map((cohortId) =>
      getAttendanceForCohort({ cohortId, userId, todate, fromDate, headers })
    )
  );

  // Nothing came back from any batch, online or from the offline cache. Return
  // nothing rather than an empty record, so screens can still tell "couldn't
  // read" apart from "no attendance marked" and raise the network alert.
  const usableResponses = responses.filter(Boolean);
  if (usableResponses.length === 0) return undefined;

  const attendanceList = mergeAttendanceLists(
    usableResponses.map((response) => response?.attendanceList)
  );

  // Shape is kept identical to the single-batch response the screens already
  // read, with the current batch's response supplying any other fields.
  return {
    ...(usableResponses[0] || {}),
    attendanceList,
    totalCount: attendanceList.length,
  };
};
export const LearningMaterialAPI = async () => {
  const user_id = await getDataFromStorage('userId'); // Ensure this is defined
  const tenantData = JSON.parse(await getDataFromStorage('tenantData'));
  const collectionFramework = tenantData?.[0]?.collectionFramework;
  const channelId = tenantData?.[0]?.channelId;
  const url = `${EndUrls.framework}${collectionFramework}`; // Define the URL
  try {
    const method = 'get'; // Define the HTTP method
    const headers = await getHeaders();

    // Construct the curl command
    // let curlCommand = `curl -X ${method.toUpperCase()} '${url}' \\\n`;
    // for (const [key, value] of Object.entries(headers || {})) {
    //   curlCommand += `-H '${key}: ${value}' \\\n`;
    // }
    // console.log('curlCom', curlCommand);

    // Make the actual request
    const result = await get(url, {
      headers: headers || {},
    });

    if (result) {
      await storeApiResponse(user_id, url, 'get', null, result?.data);
      return result?.data;
    } else {
      const result_offline = await getApiResponse(user_id, url, 'get', null);
      return result_offline;
    }
  } catch (e) {
    console.log('No internet available, retrieving offline data...');
    const result_offline = await getApiResponse(user_id, url, 'get', null);
    return result_offline;
  }
};

export const notificationSubscribe = async ({ deviceId, user_id, action }) => {
  try {
    const url = `${EndUrls.update_profile}/${user_id}`; // Define the URL
    const headers = await getHeaders(); // Ensure headers are awaited
    const payload = {
      userData: {
        deviceId: deviceId,
        action: action,
      },
    };

    // Construct cURL command
    const curlCommand = `
    curl -X PATCH '${url}' \\
    -H 'Content-Type: application/json' \\
    -H 'Accept: application/json' \\
    -H 'Authorization:  ${headers.Authorization}' \\
    -H 'tenantId: ${headers.tenantId}' \\
    -d '${JSON.stringify(payload)}'
        `;
    // console.log('cURL Command:', curlCommand);

    // Make the actual request
    const result = await patch(url, payload, {
      headers: headers || {},
    });

    if (result?.data) {
      return result?.data;
    } else {
      return {};
    }
  } catch (e) {
    return handleResponseException(e);
  }
};

export const filterContent = async ({ instantId }) => {
  const tenantData = JSON.parse(await getDataFromStorage('tenantData'));
  const collectionFramework = tenantData?.[0]?.collectionFramework;
  const channelId = tenantData?.[0]?.channelId;
  const url = `${EndUrls.filterContent}/${collectionFramework}`; // Define the URL
  try {
    const method = 'get'; // Define the HTTP method
    const headers = await getHeaders();

    // Construct the curl command
    let curlCommand = `curl -X ${method.toUpperCase()} '${url}' \\\n`;
    for (const [key, value] of Object.entries(headers || {})) {
      curlCommand += `-H '${key}: ${value}' \\\n`;
    }
    console.log('curlCom fetchTopics', curlCommand);

    // Make the actual request
    const result = await get(url, {
      headers: headers || {},
    });

    if (result) {
      return result?.data?.result;
    }
  } catch (e) {
    console.log('No internet available, retrieving offline data...', e);
  }
};

export const staticFilterContent = async ({ instantId }) => {
  const tenantData = JSON.parse(await getDataFromStorage('tenantData'));
  const collectionFramework = tenantData?.[0]?.collectionFramework;
  const channelId = tenantData?.[0]?.channelId;
  const url = `${EndUrls.staticFilterContent}`; // Define the URL
  const headers = await getHeaders();
  const payload = {
    request: {
      objectCategoryDefinition: {
        objectType: 'Collection',
        name: 'Course',
        channel: channelId,
      },
    },
  };
  try {
    const curlCommand = `
    curl -X POST '${url}' \\
    -H 'Content-Type: application/json' \\
    -H 'Accept: application/json' \\
    -d '${JSON.stringify(payload)}'
        `;
    console.log('cURL Command:', curlCommand);

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      return result?.data?.result;
    }
  } catch (e) {
    console.log('e', e);
  }
};
export const CourseEnrollStatus = async ({ course_id }) => {
  const url = `${EndUrls.courseEnrollStatus}`; // Define the URL
  const headers = await getHeaders();
  const headersString = Object.entries(headers)
    .map(([key, value]) => `-H "${key}: ${value}"`)
    .join(' ');

  const user_id = await getDataFromStorage('userId');
  const payload = {
    userId: user_id,
    courseId: course_id,
  };
  try {
    const curlCommand = `curl -X POST ${headersString} -d '${JSON.stringify(
      payload
    )}' ${url}`;

    console.log('cURL Command:', curlCommand);

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      await storeApiResponse(user_id, url, 'post', payload, result?.data);
      return result?.data;
    } else {
      const result_offline = await getApiResponse(
        user_id,
        url,
        'post',
        payload
      );
      return result_offline;
    }
  } catch (e) {
    console.log('e', e);
    const result_offline = await getApiResponse(user_id, url, 'post', payload);
    return result_offline;
  }
};
export const courseEnroll = async ({ course_id }) => {
  const url = `${EndUrls.courseEnroll}`; // Define the URL
  const enrollStatusUrl = `${EndUrls.courseEnrollStatus}`; // Status cache used by CourseEnrollStatus
  const headers = await getHeaders();
  const headersString = Object.entries(headers)
    .map(([key, value]) => `-H "${key}: ${value}"`)
    .join(' ');

  const user_id = await getDataFromStorage('userId');
  const payload = {
    userId: user_id,
    courseId: course_id,
  };
  try {
    const curlCommand = `curl -X POST ${headersString} -d '${JSON.stringify(
      payload
    )}' ${url}`;

    console.log('cURL Command:', curlCommand);

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      // Keep the cached enrollment status (read by CourseEnrollStatus's offline
      // fallback) in sync so it reflects the new enrollment immediately, instead
      // of the stale pre-enrollment record it would otherwise fall back to.
      await storeApiResponse(
        user_id,
        enrollStatusUrl,
        'post',
        payload,
        result?.data
      );
      return result?.data;
    }
  } catch (e) {
    console.log('e', e);
  }
};
export const updateCourseStatus = async ({ course_id, status }) => {
  const url = `${EndUrls.updateCourseStatus}`; // Define the URL
  const headers = await getHeaders();
  const headersString = Object.entries(headers)
    .map(([key, value]) => `-H "${key}: ${value}"`)
    .join(' ');

  const user_id = await getDataFromStorage('userId');
  const payload = {
    userId: user_id,
    courseId: course_id,
    ...(status && { status: status }),
  };
  try {
    const curlCommand = `curl -X POST ${headersString} -d '${JSON.stringify(
      payload
    )}' ${url}`;

    console.log('cURL Command:', curlCommand);

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    console.log('######### course inprogress:', JSON.stringify(result));

    if (result) {
      return result?.data;
    }
  } catch (e) {
    console.log('e', e);
  }
};
export const issueCertificate = async ({ payload }) => {
  const url = `${EndUrls.issueCertificate}`; // Define the URL
  const headers = await getHeaders();
  const headersString = Object.entries(headers)
    .map(([key, value]) => `-H "${key}: ${value}"`)
    .join(' ');

  try {
    const curlCommand = `curl -X POST ${headersString} -d '${JSON.stringify(
      payload
    )}' ${url}`;

    console.log('issueCertificate cURL Command:', curlCommand);

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      return result?.data;
    }
  } catch (e) {
    console.log('e', e);
  }
};
/**
 * Course content metadata is loosely typed server-side. `certificateTemplate`
 * has been observed as a plain string, a single-element array, an object
 * carrying the id under `identifier`/`templateId`, or absent/null/blank.
 * Normalises all of those shapes to a clean string id, or null.
 */
export const normalizeCertificateTemplateId = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (Array.isArray(value)) {
    return value.length ? normalizeCertificateTemplateId(value[0]) : null;
  }

  if (typeof value === 'object') {
    return (
      normalizeCertificateTemplateId(value.identifier) ||
      normalizeCertificateTemplateId(value.templateId) ||
      null
    );
  }

  return null;
};

/**
 * Single fallback chain for the certificate render templateId, shared by
 * viewCertificate/downloadCertificate/shareCertificate: a course-level
 * certificateTemplate wins; otherwise fall back to the locally-stored
 * tenant/program template id (unchanged from today).
 */
export const resolveCertificateTemplateId = async (
  courseCertificateTemplate
) => {
  const courseTemplateId = normalizeCertificateTemplateId(
    courseCertificateTemplate
  );

  if (courseTemplateId) {
    return courseTemplateId;
  }

  return await getDataFromStorage('templateId');
};

export const viewCertificate = async ({
  certificateId,
  certificateTemplate,
}) => {
  const url = `${EndUrls.viewCertificate}`; // Define the URL
  const headers = await getHeaders();
  const headersString = Object.entries(headers)
    .map(([key, value]) => `-H "${key}: ${value}"`)
    .join(' ');
  const user_id = await getDataFromStorage('userId');
  const template_id = await resolveCertificateTemplateId(certificateTemplate);

  const payload = {
    credentialId: certificateId,
    templateId: template_id,
  };

  try {
    const curlCommand = `curl -X POST ${headersString} -d '${JSON.stringify(
      payload
    )}' ${url}`;

    console.log('cURL Command:', curlCommand);

    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });

    if (result) {
      await storeApiResponse(user_id, url, 'post', payload, result?.data);
      return result?.data;
    } else {
      const result_offline = await getApiResponse(
        user_id,
        url,
        'post',
        payload
      );
      return result_offline;
    }
  } catch (e) {
    console.log('e', e);
    const result_offline = await getApiResponse(user_id, url, 'post', payload);
    return result_offline;
  }
};
export const enrollInterest = async (selectedIds) => {
  const url = `${EndUrls.enrollInterest}`; // Define the URL
  const headers = await getHeaders();
  const profileDetails = JSON.parse(await getDataFromStorage('profileData'))
    ?.getUserDetails?.[0];

  const customFields = profileDetails?.customFields.reduce(
    (acc, { label, selectedValues }) => {
      acc[label] = Array.isArray(selectedValues)
        ? selectedValues.map((item) => item?.value).join(', ')
        : selectedValues; // If not an array, assign directly

      return acc;
    },
    {}
  );
  const headersString = Object.entries(headers)
    .map(([key, value]) => `-H "${key}: ${value}"`)
    .join(' ');
  const payload = {
    first_name: profileDetails?.firstName,
    middle_name: profileDetails?.middleName ? profileDetails?.middleName : '',
    last_name: profileDetails?.lastName,
    mother_name: customFields?.MOTHER_NAME ? customFields?.MOTHER_NAME : '',
    gender: profileDetails?.gender,
    email_address: profileDetails?.email
      ? profileDetails?.email
      : 'test@tekditechnologies.com',
    dob: profileDetails?.dob,
    qualification:
      customFields?.HIGHEST_EDCATIONAL_QUALIFICATION_OR_LAST_PASSED_GRADE
        ? customFields?.HIGHEST_EDCATIONAL_QUALIFICATION_OR_LAST_PASSED_GRADE
        : '',
    phone_number: profileDetails?.mobile,
    state: customFields?.STATE ? customFields?.STATE : '',
    district: customFields?.DISTRICT ? customFields?.DISTRICT : '',
    block: customFields?.BLOCK ? customFields?.BLOCK : '',
    village: customFields?.VILLAGE ? customFields?.VILLAGE : '',
    blood_group: '',
    userId: profileDetails?.userId,
    enrollmentId: profileDetails?.enrollmentId || '',
    courseId: '',
    courseName: '',
    topicName: selectedIds?.label,
  };
  const curlCommand = `curl -X POST ${headersString} -d '${JSON.stringify(
    payload
  )}' ${url}`;
  console.log('cURL enrollInterest Command:', curlCommand);
  try {
    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });
    if (result) {
      return result?.data;
    }
  } catch (e) {
    console.log('e', e);
  }
};
export const telemetryTrackingData = async ({ telemetryPayloadData }) => {
  const url = `${EndUrls.telemetryTrackingData}`; // Define the URL
  const headers = await getHeaders();
  const profileDetails = JSON.parse(await getDataFromStorage('profileData'))
    ?.getUserDetails?.[0];

  const headersString = Object.entries(headers)
    .map(([key, value]) => `-H "${key}: ${value}"`)
    .join(' ');
  const payload = {
    id: 'api.sunbird.telemetry',
    ver: '3.0',
    params: {
      msgid: '35cfea6c3cf2b3de56fd03c9b52a8de1',
    },
    ets: telemetryPayloadData?.ets,
    events: [
      {
        eid: 'IMPRESSION',
        ets: telemetryPayloadData?.ets,
        ver: '3.0',
        mid: 'IMPRESSION:fc44e5d5f9549938db7cce963cc0d6ad',
        actor: {
          id: 'Anonymous',
          type: 'User',
        },
        context: {
          channel: 'pratham-learner-app',
          pdata: {
            id: 'pratham-learner-app',
            pid: '0.0.1',
            ver: 'pratham-learner-app',
          },
          env: telemetryPayloadData?.event,
          sid: profileDetails?.userId,
          did: '86d25010904db7eed2c034cfc7109b4c',
          cdata: [
            {
              id: profileDetails?.userId,
              type: 'UserSession',
            },
            {
              id: 'uuid',
              type: 'Device',
            },
          ],
          rollup: {},
          uid: profileDetails?.userId,
          userName: profileDetails?.username,
        },
        object: {},
        tags: [],
        edata: {
          type: telemetryPayloadData?.type,
          subtype: '',
          pageid: telemetryPayloadData?.event,
          uri: telemetryPayloadData?.event,
        },
      },
    ],
  };
  const curlCommand = `curl -X POST ${headersString} -d '${JSON.stringify(
    payload
  )}' ${url}`;
  console.log('cURL Command telemetryTrackingData:', curlCommand);
  try {
    // Make the actual request
    const result = await post(url, payload, {
      headers: headers || {},
    });
    if (result) {
      return result?.data;
    }
  } catch (e) {
    console.log('e', e);
  }
};
export const cohortSearch = async ({ customFields }) => {
  const token = await getDataFromStorage('Accesstoken');
  const academicYearId = await getDataFromStorage('academicYearId');
  const tenantId = await getDataFromStorage('userTenantid');

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    tenantid: tenantId,
    academicyearid: academicYearId,
  };

  const url = `${EndUrls.cohortSearch}`;
  const headersString = Object.entries(headers)
    .map(([key, value]) => `-H "${key}: ${value}"`)
    .join(' ');
  const payload = {
    limit: 10,
    offset: 0,
    filters: {
      state: customFields?.STATE,
      district: customFields?.DISTRICT,
      // block: customFields?.BLOCK,
      // village: customFields?.VILLAGE,
    },
  };

  const curlCommand = `curl -X POST ${headersString} -d '${JSON.stringify(
    payload
  )}' ${url}`;
  console.log('cURL Command:', curlCommand);

  try {
    const result = await post(url, payload, { headers });
    return result?.data?.result;
  } catch (e) {
    if (e?.response?.data) {
      return e.response.data;
    }

    return { error: true, message: e.message || 'Unknown error' };
  }
};

export const downloadCertificate = async ({
  certificateId,
  certificateName,
  certificateHtml,
  certificateTemplate,
}) => {
  const user_id = await getDataFromStorage('userId');

  let htmlContent = certificateHtml;

  // Fetch HTML from API if not provided by caller
  if (!htmlContent) {
    const template_id = await resolveCertificateTemplateId(
      certificateTemplate
    );
    const url = `${EndUrls.viewCertificate}`;
    const headers = await getHeaders();
    const payload = { credentialId: certificateId, templateId: template_id };
    try {
      const result = await post(url, payload, { headers: headers || {} });
      htmlContent = result?.data?.result;
    } catch (e) {
      console.error('Error fetching certificate HTML:', e);
      Alert.alert('Error', 'Failed to fetch certificate content');
      return false;
    }
  }

  if (!htmlContent) {
    Alert.alert('Error', 'No certificate content available');
    return false;
  }

  const fileName = `${certificateName}_${user_id}`;

  // The web version captures only the .page element (1120×790 px) from a hidden
  // iframe, then stretches it to fill A4 landscape. Here we mirror that by:
  //   1. Setting the viewport to 1120px so the WebView renders at the same width
  //   2. Clamping html/body to exactly 1120×790px and hiding overflow — this
  //      removes all blank space that exists outside the .page element
  //   3. Suppressing page-breaks so PrintDocumentAdapter produces exactly 1 page
  const certCss = `
    <meta name="viewport" content="width=1120, initial-scale=1.0">
    <style>
      @page { margin: 0; size: landscape; }
      html {
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 1120px !important;
        height: 790px !important;
        overflow: hidden !important;
        background: white !important;
        display: block !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
      }
      .page {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 1120px !important;
        height: 790px !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
      }
    </style>`;
  const processedHtml = htmlContent.includes('</head>')
    ? htmlContent.replace('</head>', `${certCss}</head>`)
    : certCss + htmlContent;

  try {
    // Convert HTML to PDF using Android WebView print pipeline (same quality as browser)
    // A4 landscape dimensions in points (1 pt = 1/72 inch): 841 x 595
    const file = await RNHTMLtoPDF.convert({
      html: processedHtml,
      fileName,
      directory: 'Documents',
      width: 841,
      height: 595,
    });

    const destPath = `${RNFS.DownloadDirectoryPath}/${fileName}.pdf`;
    await RNFS.copyFile(file.filePath, destPath);

    Alert.alert('Success', `Certificate saved to Downloads`);
    console.log('Certificate PDF saved to:', destPath);
    return true;
  } catch (error) {
    console.error('Error generating certificate PDF:', error);
    Alert.alert('Error', 'Failed to download certificate');
    return false;
  }
};
export const shareCertificate = async ({
  certificateId,
  certificateName,
  certificateHtml,
  certificateTemplate,
}) => {
  const user_id = await getDataFromStorage('userId');

  let htmlContent = certificateHtml;

  if (!htmlContent) {
    const template_id = await resolveCertificateTemplateId(
      certificateTemplate
    );
    const url = `${EndUrls.viewCertificate}`;
    const headers = await getHeaders();
    const payload = { credentialId: certificateId, templateId: template_id };
    try {
      const result = await post(url, payload, { headers: headers || {} });
      htmlContent = result?.data?.result;
    } catch (e) {
      console.error('Error fetching certificate HTML:', e);
      Alert.alert('Error', 'Failed to fetch certificate content');
      return false;
    }
  }

  if (!htmlContent) {
    Alert.alert('Error', 'No certificate content available');
    return false;
  }

  const certCss = `
    <meta name="viewport" content="width=1120, initial-scale=1.0">
    <style>
      @page { margin: 0; size: landscape; }
      html {
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 1120px !important;
        height: 790px !important;
        overflow: hidden !important;
        background: white !important;
        display: block !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
      }
      .page {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 1120px !important;
        height: 790px !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
      }
    </style>`;
  const processedHtml = htmlContent.includes('</head>')
    ? htmlContent.replace('</head>', `${certCss}</head>`)
    : certCss + htmlContent;

  try {
    const fileName = `${certificateName}_${user_id}_share`;
    // base64:true avoids file:// URI + FileProvider requirement on Android 7+
    const file = await RNHTMLtoPDF.convert({
      html: processedHtml,
      fileName,
      base64: true,
      width: 841,
      height: 595,
    });

    await Share.open({
      title: 'Share Certificate',
      url: `data:application/pdf;base64,${file.base64}`,
      type: 'application/pdf',
      failOnCancel: false,
    });
    return true;
  } catch (error) {
    if (error?.message !== 'User did not share') {
      console.error('Error sharing certificate:', error);
      Alert.alert('Error', 'Failed to share certificate');
    }
    return false;
  }
};

export const ContentSearch = async ({
  query = '',
  filters,
  fields,
  sort_by,
  limit = 5,
  offset = 0,
} = {}) => {
  try {
    const url = `${EndUrls.contentSearch}`;
    const payload = {
      request: {
        filters: filters || {},
        fields: fields || [
          'name',
          'appIcon',
          'description',
          'mimeType',
          'identifier',
          'primaryCategory',
        ],
        sort_by,
        query,
        limit,
        offset,
      },
    };
    const result = await post(url, payload);
    return result?.data;
  } catch (e) {
    console.error('Error in ContentSearch:', e);
    throw e;
  }
};

// export const getRegistrationAssessmentStatus = async ({
//   userId,
//   courseId,
//   unitId,
//   contentId,
// }) => {
//   try {
//     const url = `${EndUrls.AssessmentSearch}`;
//     const headers = await getHeaders();
//     const payload = { userId, courseId, unitId, contentId };
//     const result = await post(url, payload, { headers: headers || {} });
//     return result?.data?.data;
//   } catch (e) {
//     return handleResponseException(e);
//   }
// };

// export const ContentSearch = async ({
//   query = '',
//   filters,
//   fields,
//   sort_by,
//   limit = 5,
//   offset = 0,
// } = {}) => {
//   try {
//     const url = `${EndUrls.contentSearch}`;
//     const payload = {
//       request: {
//         filters: filters || {},
//         fields: fields || [
//           'name',
//           'appIcon',
//           'description',
//           'mimeType',
//           'identifier',
//           'primaryCategory',
//         ],
//         sort_by,
//         query,
//         limit,
//         offset,
//       },
//     };
//     const result = await post(url, payload);
//     return result?.data;
//   } catch (e) {
//     console.error('Error in ContentSearch:', e);
//     throw e;
//   }
// };

export const getRegistrationAssessmentStatus = async ({
  userId,
  courseId,
  unitId,
  contentId,
}) => {
  try {
    const url = `${EndUrls.AssessmentSearch}`;
    const headers = await getHeaders();
    const payload = { userId, courseId, unitId, contentId };
    const result = await post(url, payload, { headers: headers || {} });
    return result?.data?.data;
  } catch (e) {
    return handleResponseException(e);
  }
};
