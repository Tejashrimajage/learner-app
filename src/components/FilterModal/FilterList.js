import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from '../../context/LanguageContext';
import PropTypes from 'prop-types';
import globalStyles from '../../utils/Helper/Style';
import { Button } from '@ui-kitten/components';
import GlobalText from '@components/GlobalText/GlobalText';
import CustomCheckbox from '@components/Checkboxes/CustomCheckbox';
import CustomCheckbox2 from '@components/Checkboxes/CustomCheckbox2';
import { filterContent, staticFilterContent } from '@src/utils/API/AuthService';
import ActiveLoading from '@src/screens/LoadingScreen/ActiveLoading';
import { useInternet } from '../../context/NetworkContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  getDataFromStorage,
  getPreferredContentLanguageSelection,
} from '../../utils/JsHelper/Helper';
import { CONTENT_PLATFORM_IDS } from '../../utils/Constants/app-constants';

const FilterList = ({
  setParentFormData,
  setParentStaticFormData,
  parentStaticFormData,
  setOrginalFormData,
  orginalFormData,
  instant,
  setIsDrawerOpen,
  contentFilter,
  isExplore,
}) => {
  const { t } = useTranslation();
  const [filterData, setFilterData] = useState([]);
  const [renderForm, setrenderForm] = useState([]);
  const [renderStaticForm, setRenderStaticForm] = useState([]);
  const [staticFilter, setStaticFilter] = useState([]);
  const [formData, setFormData] = useState([]);
  const [staticFormData, setStaticFormData] = useState([]);
  const [userSelectedFormData, setUserSelectedFormData] = useState({});
  const [userSelectedStaticFormData, setUserSelectedStaticFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({});
  const [channelId, setChannelId] = useState(null);
  const { isConnected } = useInternet();
  console.log('staticFormData---', staticFormData);
  
  // Log selected filters in a more readable format
  const logSelectedFilters = () => {
    
    // Log dynamic filters
    if (Object.keys(formData).length > 0) {
      console.log('Dynamic Filters:');
      Object.keys(formData).forEach(category => {
        if (formData[category] && formData[category].length > 0) {
          console.log(`  ${category}:`, formData[category].map(item => item.name || item.code));
        }
      });
    } else {
      console.log('Dynamic Filters: None selected');
    }
    
    // Log static filters
    if (Object.keys(staticFormData).length > 0) {
      console.log('Static Filters:');
      Object.keys(staticFormData).forEach(category => {
        if (staticFormData[category] && staticFormData[category].length > 0) {
          console.log(`  ${category}:`, staticFormData[category]);
        }
      });
    } else {
    }
  };
  
  // Call the logging function whenever formData or staticFormData changes
  useEffect(() => {
    logSelectedFilters();
  }, [formData, staticFormData]);

  // Track user selections whenever formData or staticFormData changes
  useEffect(() => {
    updateUserSelections(formData, staticFormData);
  }, [formData, staticFormData]);

  // Initialize expanded sections
  useEffect(() => {
    const initialExpanded = {};
    renderForm.forEach((item) => {
      initialExpanded[item.code] = true; // Default to expanded
    });
    renderStaticForm.forEach((item) => {
      initialExpanded[item.code] = true; // Default to expanded
    });
    setExpandedSections(initialExpanded);
  }, [renderForm, renderStaticForm]);

  // useEffect(() => {
  //   setParentFormData(formData);
  //   setParentStaticFormData(staticFormData);
  // }, [formData, staticFormData]);

  // console.log('formData', formData);

  var maxIndex = renderForm.length;
  //convert transformCategoriesto array of obj
  function convertToStructuredArray(obj) {
    return Object.keys(obj).map((key) => ({
      [key]: {
        name: obj[key].name,
        code: obj[key].code,
        options: obj[key].options,
      },
    }));
  }
  // Key value pair function
  function transformCategories(categories) {
    return categories
      .sort((a, b) => a.index - b.index)
      .reduce((acc, category) => {
        acc[category.code] = {
          name: category.name,
          code: category.code,
          index: category.ndex,
          options: category.terms
            .sort((a, b) => a.index - b.index)
            .map((term) => {
              // Group associations by category
              const groupedAssociations =
                term.associations?.reduce((grouped, assoc) => {
                  if (!grouped[assoc.category]) {
                    grouped[assoc.category] = [];
                  }
                  grouped[assoc.category].push(assoc);
                  return grouped;
                }, {}) || {};

              // Sort each category's associations by index
              Object.keys(groupedAssociations).forEach((key) => {
                groupedAssociations[key].sort((a, b) => a.index - b.index);
              });

              return {
                code: term.code,
                name: term.name,
                category: term.category,
                associations: groupedAssociations, // Associations grouped by category
              };
            }),
        };

        return acc;
      }, {});
  }

  function transformRenderForm(categories) {
    return categories
      .sort((a, b) => a.index - b.index)
      .map((category) => ({
        name: category.name,
        code: category.code,
        options: category.terms
          .sort((a, b) => a.index - b.index)
          .map((term) => ({
            code: term.code,
            name: term.name,
            identifier: term.identifier,
          })),
        // associations: category.terms.flatMap((term) => term.associations || []),
        index: category.index,
      }));
  }

  function filterObjectsWithSourceCategory(data, filteredNames) {
    const filter = data?.filter((section) =>
      // eslint-disable-next-line no-prototype-builtins
      section.fields.some((field) => field?.hasOwnProperty('sourceCategory'))
    );
    setStaticFilter(filter);
    const filterData = removeFilteredFields(filter, filteredNames);
    return filterData;
  }

  function removeFilteredFields(filter, filteredNames) {
    return filter.map((category) => ({
      ...category,
      fields: category.fields.filter(
        (field) => !filteredNames.includes(field.name)
      ),
    }));
  }

  function extractNames(renderForm) {
    return renderForm.map((item) => item.name);
  }

  // Custom ordering function for filter sections
  const getFilterOrder = (itemName) => {
    const orderMap = {
      'Content Language': 1,
      'Language': 1,
      'Sub Domain': 2,
      'Subdomain': 2,
      'Subject': 3,
      'Domain': 4,
      'Category': 5,
      'Program': 6,
    };
    
    return orderMap[itemName] || 999; // Default to end for unknown items
  };

  const sortFilterSections = (sections) => {
    return sections.sort((a, b) => {
      const orderA = getFilterOrder(a.name);
      const orderB = getFilterOrder(b.name);
      return orderA - orderB;
    });
  };

  const toggleSection = (sectionCode) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionCode]: !prev[sectionCode]
    }));
  };

  const renderFilterSection = (item, key, isStatic = false) => {
    // Static fields can arrive without a `range`, dynamic ones without
    // `options`; there is nothing to show for those, so skip them.
    // (An empty list still renders, as dependent categories rely on that.)
    const sectionOptions = isStatic ? item?.range : item?.options;
    if (!Array.isArray(sectionOptions)) {
      return null;
    }

    const isExpanded = expandedSections[item.code];
    const selectedCount = isStatic 
      ? (staticFormData?.[item.code]?.length || 0)
      : (formData?.[item.code]?.length || 0);

    return (
      <View key={key} style={styles.filterSection}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(item.code)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderContent}>
            <GlobalText style={styles.sectionTitle}>
              {item.name}
            </GlobalText>
            {selectedCount > 0 && (
              <View style={styles.selectedCount}>
                <GlobalText style={styles.selectedCountText}>
                  {selectedCount}
                </GlobalText>
              </View>
            )}
          </View>
          <MaterialIcons
            name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={24}
            color="#666"
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionContent}>
            {isStatic ? (
              <CustomCheckbox2
                setStaticFormData={setStaticFormData}
                staticFormData={staticFormData}
                options={sectionOptions}
                category={item.code}
                showMoreLimit={3}
              />
            ) : (
              <CustomCheckbox
                setFormData={setFormData}
                formData={formData}
                options={sectionOptions}
                category={item.code}
                index={item.index}
                replaceOptionsWithAssoc={replaceOptionsWithAssoc}
                showMoreLimit={3}
              />
            )}
          </View>
        )}
      </View>
    );
  };

  const fetchData = async () => {
    setLoading(true);
    const instantId = instant?.frameworkId;
    const data = await filterContent({ instantId });
    const categories = data?.framework?.categories;
    const transformedOutput = transformCategories(categories);
    const result = convertToStructuredArray(transformedOutput);

    // RenderForm
    const transformRenderFormOutput = transformRenderForm(categories || []);
    console.log('transformRenderFormOutput===>', transformRenderFormOutput);

    // ✅ Preselect single-option categories
    const defaultFormData = {};
    transformRenderFormOutput.forEach((item) => {
      if (item.options.length === 1) {
        defaultFormData[item.code] = [item.options[0]];
      }
    });

    console.log(
      'transformRenderFormOutput===>',
      JSON.stringify(transformRenderFormOutput)
    );

    setrenderForm(transformRenderFormOutput);
    await fetchStaticForm(transformRenderFormOutput);
    setFilterData(result);

    if (contentFilter) {
      const filterData = transformRenderFormOutput.filter(
        (item) => item?.name === 'Domain'
      );
      const selectedDomain = filterData?.[0]?.options.filter((item) => {
        return item?.name == contentFilter?.domain;
      });

      setFormData((prev) => ({
        ...prev,
        domain: selectedDomain,
      }));
    }

    // setFormData(defaultFormData); // ✅ Set default selections
  };

  useEffect(() => {
    if (renderForm && contentFilter) {
      const filterData = renderForm.filter((item) => item?.name === 'Domain');
      const selectedDomain = filterData?.[0]?.options.filter((item) => {
        return item?.name == contentFilter?.domain;
      });
      // console.log('selectedDomain==>', selectedDomain);
      // console.log('formData?.domain==>', formData?.domain);
      // console.log('.length==>', formData?.domain?.length);

      if (
        formData?.domain?.[0]?.code === selectedDomain?.[0]?.code &&
        formData?.domain?.length === 1
      ) {
        // console.log('reached IN');
        replaceOptionsWithAssoc({
          category: 'domain',
          index: 1,
          newCategoryData: [
            {
              code: 'learningForWork',
              identifier: 'pos-framework_domain_learningforwork',
              index: 1,
              name: 'Learning for Work',
            },
          ],
        });
      } else if (formData?.domain?.length === 0) {
        replaceOptionsWithAssoc({
          category: 'domain',
          index: 1,
          newCategoryData: [
            {
              code: 'learningForWork',
              identifier: 'pos-framework_domain_learningforwork',
              index: 1,
              name: 'Learning for Work',
            },
          ],
        });
      }
    }
  }, [formData?.domain]);

  const fetchStaticForm = async (transformRenderFormOutput) => {
    const instantId = instant?.channelId;
    const data = await staticFilterContent({ instantId });
    const form = data?.objectCategoryDefinition?.forms?.create?.properties;
    const filteredNames = extractNames(transformRenderFormOutput);
    const filteredForm = filterObjectsWithSourceCategory(form, filteredNames);

    setRenderStaticForm(filteredForm?.[0]?.fields);
    if (contentFilter) {
      const filterData = filteredForm?.[0]?.fields.filter(
        (item) => item?.name === 'Program'
      );
      console.log('contentFilter===>', contentFilter);
      const selectedProgram = filterData?.[0]?.range.filter((item) => {
        return item == contentFilter?.program;
      });

      console.log('selectedDomain===>', selectedProgram);
      // "program": ["Pragyanpath"]
      setStaticFormData((prev) => ({
        ...prev,
        program: selectedProgram,
      }));
    }

    const preferredLanguage = await getPreferredContentLanguageSelection(
      filteredForm?.[0]?.fields || []
    );

    if (preferredLanguage) {
      setStaticFormData((prev) => {
        const normalizedPrev = Array.isArray(prev) ? {} : prev || {};
        if (normalizedPrev[preferredLanguage.code]?.length > 0) {
          return normalizedPrev;
        }
        return {
          ...normalizedPrev,
          [preferredLanguage.code]: preferredLanguage.values,
        };
      });
    }

    // setFilterData(result);
    setLoading(false);
  };

  useEffect(() => {
    if (isConnected) {
      fetchData();
      setFormData(orginalFormData);
      setStaticFormData(parentStaticFormData);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch channelId on component mount
  useEffect(() => {
    const fetchChannelId = async () => {
      try {
        const tenantData = JSON.parse(await getDataFromStorage('tenantData'));
        const channelIdValue = tenantData?.[0]?.channelId;
        setChannelId(channelIdValue);
      } catch (error) {
        console.error('Error fetching channelId:', error);
      }
    };
    fetchChannelId();
  }, []);

  const findAndRemoveIndexes = (currentSelectedIndex, maxIndex, form) => {
    return form.map((item) => ({
      ...item,
      options: item.index > currentSelectedIndex ? [] : item.options,
    }));
  };

  const updateRenderFormWithAssociations = (
    category,
    newCategoryData,
    form,
    renderForm
  ) => {
    // Find the object in form that matches the given category
    // console.log('category', category);
    // console.log('newCategoryData', JSON.stringify(newCategoryData));
    // console.log('form', JSON.stringify(form));
    // console.log('renderForm', JSON.stringify(renderForm));

    const categoryObject = form.find((obj) => obj[category]);
    if (!categoryObject) return renderForm; // If category not found, return original renderForm

    const categoryData = categoryObject[category];
    // Find matching options in form based on newCategoryData
    const newCategoryCodes = newCategoryData.map((category) => category.code);
    const matchedOptions = categoryData.options.filter((option) =>
      newCategoryCodes.includes(option.code)
    );
    // console.log('matchedOptions', JSON.stringify(matchedOptions));

    // Extract associations from matched options, ensuring no duplicates
    let associationsToPush = {};

    matchedOptions.forEach((option) => {
      Object.keys(option.associations).forEach((assocKey) => {
        if (!associationsToPush[assocKey]) {
          associationsToPush[assocKey] = [];
        }

        // Merge unique options by checking for duplicate codes
        option.associations[assocKey].forEach((newOption) => {
          const existingIndex = associationsToPush[assocKey].findIndex(
            (opt) => opt.code === newOption.code
          );

          if (existingIndex !== -1) {
            // Replace existing option with the new one
            associationsToPush[assocKey][existingIndex] = newOption;
          } else {
            // Add new option if it doesn’t exist
            associationsToPush[assocKey].push(newOption);
          }
        });
      });
    });

    // Push associations into renderForm based on the association key
    return renderForm.map((item) => {
      const assocKey = item.code; // The key in renderForm should match the association category

      return {
        ...item,
        options: associationsToPush[assocKey] || item.options, // Update options if association exists
      };
    });
  };

  const replaceOptionsWithAssoc = ({ category, index, newCategoryData }) => {
    // console.log('########################', {
    //   category,
    //   index,
    //   newCategoryData,
    // });

    if (newCategoryData?.length === 0 && index === 1) {
      // fetchData();
    } else {
      const data = findAndRemoveIndexes(index, maxIndex, renderForm);

      const newData = updateRenderFormWithAssociations(
        category,
        newCategoryData,
        filterData,
        data
      );
      const cleanedFormData = cleanFormData(newData);

      setrenderForm(newData);
      return cleanedFormData;
    }
  };

  const cleanFormData = (renderForm) => {
    let cleanedFormData = { ...formData };

    Object.keys(cleanedFormData).forEach((key) => {
      // Find corresponding renderForm object by matching code
      const renderFormItem = renderForm.find((item) => item.code === key);

      if (renderFormItem) {
        // Extract valid option codes from renderForm
        const validCodes = renderFormItem.options.map((option) => option.code);

        // Filter formData values that have a code present in validCodes
        cleanedFormData[key] = cleanedFormData[key].filter((value) =>
          validCodes.includes(value.code)
        );

        // Remove the key if no valid values remain
        if (cleanedFormData[key].length === 0) {
          delete cleanedFormData[key];
        }
      }
    });

    return cleanedFormData;
  };

  const transformFormData = (formData, staticFilter) => {
    // Create a mapping from sourceCategory to code
    const categoryToCodeMap = {};
    staticFilter.forEach((filter) => {
      filter.fields.forEach((field) => {
        if (field.sourceCategory) {
          categoryToCodeMap[field.sourceCategory] = field.code;
        }
      });
    });

    // Transform the formData object
    const transformedData = {};
    Object.keys(formData).forEach((key) => {
      if (categoryToCodeMap[key]) {
        transformedData[categoryToCodeMap[key]] = formData[key].map(
          (item) => item.identifier
        );
      }
    });

    return transformedData;
  };

  const handleFilter = () => {
    const transformedFormData = transformFormData(formData, staticFilter);
    
    
    // console.log('staticFilter', JSON.stringify(renderForm));
    // console.log('staticFormData', JSON.stringify(staticFormData));
    setParentFormData(transformedFormData);
    setOrginalFormData(formData);
    setParentStaticFormData(staticFormData);
    setIsDrawerOpen(false);
  };

  // Function to get default form data (single-option categories)
  const getDefaultFormData = () => {
    const defaultFormData = {};
    renderForm.forEach((item) => {
      if (item.options.length === 1) {
        defaultFormData[item.code] = [item.options[0]];
      }
    });
    return defaultFormData;
  };

  // Function to get default static form data (from contentFilter)
  const getDefaultStaticFormData = () => {
    const defaultStaticFormData = {};
    
    if (contentFilter) {
      // Set default domain if contentFilter has domain
      if (contentFilter.domain) {
        const filterData = renderForm.filter((item) => item?.name === 'domain');
        const selectedDomain = filterData?.[0]?.options.filter((item) => {
          return item?.name == contentFilter?.domain;
        });
        if (selectedDomain && selectedDomain.length > 0) {
          defaultStaticFormData.domain = selectedDomain;
        }
      }
      
      // Set default program if contentFilter has program
      if (contentFilter.program && renderStaticForm.length > 0) {
        const filterData = renderStaticForm.filter((item) => item?.name === 'program');
        const selectedProgram = filterData?.[0]?.range.filter((item) => {
          return item == contentFilter?.program;
        });
        if (selectedProgram && selectedProgram.length > 0) {
          defaultStaticFormData.program = selectedProgram;
        }
      }
    }
    
    return defaultStaticFormData;
  };

  // Function to check if there are any user-selected filters (excluding defaults)
  const hasUserSelectedFilters = () => {
    const hasUserFormData = Object.keys(userSelectedFormData).length > 0;
    
    // Filter out contentFilter keys from userSelectedStaticFormData
    const filteredUserSelectedStaticFormData = {};
    Object.keys(userSelectedStaticFormData).forEach(key => {
      if (!contentFilter || !contentFilter.hasOwnProperty(key)) {
        filteredUserSelectedStaticFormData[key] = userSelectedStaticFormData[key];
      }
    });
    
    const hasUserStaticFormData = Object.keys(filteredUserSelectedStaticFormData).length > 0;
    
    return hasUserFormData || hasUserStaticFormData;
  };

  // Function to track user selections (excluding defaults)
  const updateUserSelections = (newFormData, newStaticFormData) => {
    const defaultFormData = getDefaultFormData();
    const defaultStaticFormData = getDefaultStaticFormData();
    
    // Filter out default selections from user selections
    const userFormData = {};
    Object.keys(newFormData).forEach(key => {
      const userSelection = newFormData[key];
      const defaultSelection = defaultFormData[key];
      
      if (defaultSelection) {
        // Check if user selection is different from default
        const isDifferent = userSelection.length !== defaultSelection.length ||
          userSelection.some(item => !defaultSelection.find(defaultItem => defaultItem.code === item.code));
        
        if (isDifferent) {
          userFormData[key] = userSelection;
        }
      } else if (userSelection && userSelection.length > 0) {
        // No default for this category, so all selections are user selections
        userFormData[key] = userSelection;
      }
    });
    
    const userStaticFormData = {};
    Object.keys(newStaticFormData).forEach(key => {
      const userSelection = newStaticFormData[key];
      const defaultSelection = defaultStaticFormData[key];
      
      if (defaultSelection) {
        // Check if user selection is different from default
        const isDifferent = userSelection.length !== defaultSelection.length ||
          userSelection.some(item => !defaultSelection.includes(item));
        
        if (isDifferent) {
          userStaticFormData[key] = userSelection;
        }
      } else if (userSelection && userSelection.length > 0) {
        // No default for this category, so all selections are user selections
        userStaticFormData[key] = userSelection;
      }
    });
    
    setUserSelectedFormData(userFormData);
    setUserSelectedStaticFormData(userStaticFormData);
  };

  const handleClearFilter = () => {
    // Get default filters that should be preserved
    const defaultFormData = getDefaultFormData();
    const defaultStaticFormData = getDefaultStaticFormData();
    
    // Remove grade from default form data, but keep board
    const filteredDefaultFormData = { ...defaultFormData };
    const isScpChannel =
      channelId === CONTENT_PLATFORM_IDS.SCP.channelId ||
      channelId === CONTENT_PLATFORM_IDS.SCP_PATHWAYS.channelId;
    if (filteredDefaultFormData.gradeLevel && isScpChannel) {
      delete filteredDefaultFormData.gradeLevel;
    }
    // Keep board if it exists
    // (board is already included if it has a single option)
    
    console.log('=== CLEARING FILTERS ===');
    console.log('Preserving default formData:', filteredDefaultFormData);
    console.log('Preserving default staticFormData:', defaultStaticFormData);
    console.log('========================');
    
    // Set to default values instead of empty objects
    setFormData(filteredDefaultFormData);
    setStaticFormData(defaultStaticFormData);
    setParentFormData({});
    setOrginalFormData(filteredDefaultFormData);
    setParentStaticFormData(defaultStaticFormData);
  };

  return (
    <View style={styles.modalContainer} activeOpacity={1}>
      <View style={styles.alertBox}>
        <View style={styles.header}>
          <GlobalText style={[globalStyles.heading2, { fontWeight: 'bold' }]}>
            {t('select_filters')}
          </GlobalText>
          {hasUserSelectedFilters() && (
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={handleClearFilter}
              activeOpacity={0.7}
            >
              <GlobalText style={styles.clearFilterText}>
                {t('clear_filter')}
              </GlobalText>
            </TouchableOpacity>
          )}
        </View>
        {/* Scrollable Content */}
        {loading ? (
          <View style={{ height: 200 }}>
            <ActiveLoading />
          </View>
        ) : (
          <>
            {!isConnected ? (
              <GlobalText
                style={[
                  globalStyles.text,
                  {
                    fontWeight: 'bold',
                    color: '#0D599E',
                    padding: 30,
                  },
                ]}
              >
                {t('sync_pending_no_internet_available')}
              </GlobalText>
            ) : (
              <ScrollView
                nestedScrollEnabled={true}
                style={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.contentContainer}>
                  {/* Content Language Filter - Show First */}
                  {renderStaticForm?.length > 0 && (
                    <>
                      {sortFilterSections(renderStaticForm || [])
                        .filter(item => 
                          item?.name === 'Content Language' || 
                          item?.name === 'Language'
                        )
                        .map((item, key) => (
                          renderFilterSection(item, key, true)
                        ))}
                    </>
                  )}

                  {/* Dynamic Filters (Categories/Subdomains) */}
                  {channelId !== CONTENT_PLATFORM_IDS.SCP.channelId &&
                    channelId !== CONTENT_PLATFORM_IDS.SCP_PATHWAYS.channelId &&
                    sortFilterSections(renderForm || []).map((item, key) => {
                    return (
                      (item?.name !== 'Domain' || isExplore == true) &&
                      !['Certificate Template', 'Skills'].includes(item?.name) && (
                        renderFilterSection(item, key, false)
                      )
                    );
                  })}

                  {/* Remaining Static Filters */}
                  {renderStaticForm?.length > 0 && (
                    <>
                      {sortFilterSections(renderStaticForm || [])
                        .filter(item => 
                          item?.name !== 'Content Language' && 
                          item?.name !== 'Language' &&
                          item?.name !== 'Certificate Template' &&
                          item?.name !== 'Skills'
                        )
                        .map((item, key) => {
                          return (
                            (item?.name !== 'Program' || isExplore == true) && (
                              renderFilterSection(item, key, true)
                            )
                          );
                        })}
                    </>
                  )}
                </View>
              </ScrollView>
            )}
          </>
        )}
        {/* Footer Buttons */}
        <View style={styles.btnbox}>
          <Button status="primary" style={styles.btn} onPress={handleFilter}>
            {() => (
              <GlobalText
                style={[globalStyles.subHeading, { marginRight: 10 }]}
              >
                {t('filter')}
              </GlobalText>
            )}
          </Button>
        </View>
      </View>
    </View>
  );
};

FilterList.propTypes = {
  onClick: PropTypes.any,
  setParentFormData: PropTypes.any,
  setParentStaticFormData: PropTypes.any,
  parentStaticFormData: PropTypes.any,
  setOrginalFormData: PropTypes.any,
  orginalFormData: PropTypes.any,
  instant: PropTypes.any,
  setIsDrawerOpen: PropTypes.any,
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  alertBox: {
    maxHeight: '98%',
  },
  header: {
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  scrollContainer: {
    width: '100%',
  },
  contentContainer: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  selectedCount: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  selectedCountText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionContent: {
    padding: 8,
  },
  sectionDivider: {
    marginVertical: 20,
    alignItems: 'center',
  },
  sectionDividerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  btn: {
    borderRadius: 30,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnbox: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  clearFilterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  clearFilterText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FilterList;
