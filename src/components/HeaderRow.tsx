import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { styles } from '../styles/globalStyles';

export const HeaderRow = ({ title, onBack, rightIcon }: any) => (
  <View style={styles.headerRow}>
    {onBack && (
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <ChevronLeft size={24} color="#fff" />
        <Text style={styles.backButtonText}> </Text> 
      </TouchableOpacity>
    )}
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={{width: 60, alignItems:'flex-end'}}>{rightIcon}</View>
  </View>
);