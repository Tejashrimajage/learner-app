import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { CheckBox } from '@ui-kitten/components';
import GlobalText from '@components/GlobalText/GlobalText';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Static filter options are usually plain strings (e.g. "Marathi"), but some
// fields (e.g. "Certificate Template") carry { identifier, label } objects
// instead. Normalise both shapes to a stable string value + display label.
const getOptionValue = (item) =>
  typeof item === 'string' ? item : item?.identifier ?? item?.label ?? '';
const getOptionLabel = (item) =>
  typeof item === 'string' ? item : item?.label ?? item?.identifier ?? '';

const CustomCheckbox2 = ({
  setStaticFormData,
  staticFormData,
  options,
  category,
  showMoreLimit = 3,
}) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [showAllOptions, setShowAllOptions] = useState(false);

  // staticFormData can briefly be an array (or undefined) while the filter
  // form is still loading, so read the category defensively.
  const selectedForCategory = Array.isArray(staticFormData?.[category])
    ? staticFormData[category]
    : [];

  useEffect(() => {
    setSelectedItems(selectedForCategory);
  }, [staticFormData, category]); // ✅ Added category to dependencies

  const toggleSelection = (item) => {
    const value = getOptionValue(item);

    setStaticFormData((prevFormData) => {
      const updatedCategoryData = prevFormData[category] || [];
      const exists = updatedCategoryData.includes(value);

      const newCategoryData = exists
        ? updatedCategoryData.filter((code) => code !== value)
        : [...updatedCategoryData, value];

      return { ...prevFormData, [category]: newCategoryData };
    });

    // ✅ Immediately update selectedItems for UI reactivity
    setSelectedItems((prevSelected) =>
      prevSelected.includes(value)
        ? prevSelected.filter((code) => code !== value)
        : [...prevSelected, value]
    );
  };

  const renderCheckboxItem = ({ item }) => {
    const value = getOptionValue(item);
    const isSelected = selectedItems.includes(value);

    return (
      <View style={styles.optionContainer}>
        <CheckBox
          checked={isSelected}
          onChange={() => toggleSelection(item)}
          style={styles.checkbox}
          checkedColor="#333"
          tintColor="#FFD700"
        >
          {() => (
            <GlobalText style={[styles.optionText, isSelected && styles.selectedText]}>
              {getOptionLabel(item)}
            </GlobalText>
          )}
        </CheckBox>
      </View>
    );
  };

  // Some static form fields come back without a `range`, so options can be
  // undefined here.
  const safeOptions = Array.isArray(options) ? options : [];
  const displayOptions = showAllOptions
    ? safeOptions
    : safeOptions.slice(0, showMoreLimit);
  const hasMoreOptions = safeOptions.length > showMoreLimit;

  return (
    <View style={styles.container}>
      <FlatList
        data={displayOptions}
        keyExtractor={(item) => getOptionValue(item)} // Ensure items are unique
        renderItem={renderCheckboxItem}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
      
      {hasMoreOptions && (
        <TouchableOpacity
          style={styles.showMoreButton}
          onPress={() => setShowAllOptions(!showAllOptions)}
          activeOpacity={0.7}
        >
          <GlobalText style={styles.showMoreText}>
            {showAllOptions ? 'Show less' : 'Show more'}
          </GlobalText>
          <MaterialIcons
            name={showAllOptions ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={16}
            color="#FFD700"
            style={styles.showMoreIcon}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 4,
  },
  optionContainer: {
    marginVertical: 2,
    paddingHorizontal: 4,
  },
  checkbox: {
    marginVertical: 2,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  selectedText: {
    fontWeight: '600',
    color: '#333',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '500',
  },
  showMoreIcon: {
    marginLeft: 4,
  },
});

export default CustomCheckbox2;
