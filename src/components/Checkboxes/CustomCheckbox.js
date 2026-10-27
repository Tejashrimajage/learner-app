import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { CheckBox } from '@ui-kitten/components';
import GlobalText from '@components/GlobalText/GlobalText';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const CustomCheckbox = ({
  options,
  category,
  setFormData,
  formData,
  replaceOptionsWithAssoc,
  index,
  showMoreLimit = 3,
}) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [showAllOptions, setShowAllOptions] = useState(false);

  useEffect(() => {
    // Initialize selectedItems with the objects from formData[category]
    const initialSelectedItems = formData[category] || [];
    setSelectedItems(initialSelectedItems);
  }, [formData, category]);

  const toggleSelection = (item) => {
    console.log('item', item);

    setFormData((prevFormData) => {
      const updatedCategoryData = prevFormData[category] || [];
      const exists = updatedCategoryData.some(
        (selectedItem) => selectedItem.identifier === item.identifier
      );

      // Toggle selection
      let newCategoryData = exists
        ? updatedCategoryData.filter(
            (selectedItem) => selectedItem.identifier !== item.identifier
          )
        : [...updatedCategoryData, { ...item, index }]; // Add index here

      // Handle cascading logic if needed
      const formKeys = Object.keys(prevFormData);
      const categoryIndex = formKeys.indexOf(category);
      const prevCategoryKey =
        categoryIndex > 0 ? formKeys[categoryIndex - 1] : null;
      const prevCategoryValues = prevCategoryKey
        ? prevFormData[prevCategoryKey]
        : [];

      let prevIndexData = {};
      let prevIndex;

      if (newCategoryData.length === 0 && categoryIndex > 0) {
        prevIndexData[prevCategoryKey] = prevCategoryValues;
        prevIndex = index - 1;
      }
      let newFormData = null;

      if (index > 1 && newCategoryData.length === 0) {
        const prevData = prevIndexData[prevCategoryKey];
        const newCategoryData = prevData
          ? prevData.map((item) => ({ ...item, index: prevIndex })) // Ensure index is carried over
          : [];
        newFormData = replaceOptionsWithAssoc({
          category: prevCategoryKey,
          index: prevIndex,
          newCategoryData,
        });
      } else {
        newFormData = replaceOptionsWithAssoc({
          category,
          index,
          newCategoryData,
        });
      }

      return { ...newFormData, [category]: newCategoryData };
    });
  };

  const renderCheckboxItem = ({ item }) => {
    const isSelected = selectedItems.some(
      (selectedItem) => selectedItem.identifier === item.identifier
    );

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
              {item.name}
            </GlobalText>
          )}
        </CheckBox>
      </View>
    );
  };

  const safeOptions = Array.isArray(options) ? options : [];
  const displayOptions = showAllOptions
    ? safeOptions
    : safeOptions.slice(0, showMoreLimit);
  const hasMoreOptions = safeOptions.length > showMoreLimit;

  return (
    <View style={styles.container}>
      <FlatList
        data={displayOptions}
        keyExtractor={(item) => item.identifier}
        renderItem={renderCheckboxItem}
        nestedScrollEnabled={true}
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

export default CustomCheckbox;
