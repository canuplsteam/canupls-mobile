import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

interface SharedChecklistProps {
  items: string[];
  onAddItem: (item: string) => void;
  onRemoveItem: (index: number) => void;
  editable: boolean;
  checkedItems?: boolean[];
  onToggleCheck?: (index: number) => void;
}

export default function SharedChecklist({
  items,
  onAddItem,
  onRemoveItem,
  editable,
  checkedItems = [],
  onToggleCheck,
}: SharedChecklistProps) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      onAddItem(newItem);
      setNewItem('');
    }
  };

  return (
    <View style={styles.container}>
      {/* Add Item Input */}
      {editable && (
        <View style={styles.addItemContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add an item..."
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            placeholderTextColor={Colors.gray[400]}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAdd}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={32} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Items List */}
      {items.length > 0 ? (
        <View style={styles.itemsList}>
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              {onToggleCheck && (
                <TouchableOpacity
                  onPress={() => onToggleCheck(index)}
                  style={styles.checkbox}
                >
                  <Ionicons
                    name={checkedItems[index] ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={checkedItems[index] ? Colors.success : Colors.gray[400]}
                  />
                </TouchableOpacity>
              )}
              <Text
                style={[
                  styles.itemText,
                  checkedItems[index] && styles.itemTextChecked,
                ]}
              >
                {item}
              </Text>
              {editable && (
                <TouchableOpacity
                  onPress={() => onRemoveItem(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>No items yet. Add your first item above!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[700],
  },
  addButton: {
    marginLeft: Spacing.sm,
  },
  itemsList: {
    gap: Spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  checkbox: {
    marginRight: Spacing.sm,
  },
  itemText: {
    flex: 1,
    fontSize: FontSizes.md,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[700],
  },
  itemTextChecked: {
    textDecorationLine: 'line-through',
    color: Colors.gray[400],
  },
  removeButton: {
    padding: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
