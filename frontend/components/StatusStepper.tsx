import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

interface StatusStepperProps {
  currentStatus: string;
}

const steps = [
  { key: 'accepted', label: 'Task Accepted', icon: 'checkmark-circle' },
  { key: 'at_location', label: 'At Shop/Location', icon: 'location' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'bicycle' },
  { key: 'delivered', label: 'Delivered', icon: 'gift' },
];

const getStepIndex = (status: string): number => {
  const statusMap: Record<string, number> = {
    'pending': 0,
    'on_way_to_pickup': 0,
    'accepted': 0,
    'at_location': 1,
    'out_for_delivery': 2,
    'delivered': 3,
  };
  return statusMap[status] ?? 0;
};

export default function StatusStepper({ currentStatus }: StatusStepperProps) {
  const currentStepIndex = getStepIndex(currentStatus);

  return (
    <View style={styles.container}>
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isActive = index === currentStepIndex;
          
          return (
            <View key={step.key} style={styles.stepWrapper}>
              {/* Step Circle */}
              <View style={styles.stepColumn}>
                <View
                  style={[
                    styles.stepCircle,
                    isCompleted && styles.stepCircleCompleted,
                    isActive && styles.stepCircleActive,
                  ]}
                >
                  <Ionicons
                    name={step.icon as any}
                    size={20}
                    color={isCompleted ? Colors.white : Colors.gray[400]}
                  />
                </View>
                
                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      isCompleted && styles.stepLineCompleted,
                    ]}
                  />
                )}
              </View>
              
              {/* Step Label */}
              <View style={styles.stepLabelContainer}>
                <Text
                  style={[
                    styles.stepLabel,
                    isCompleted && styles.stepLabelCompleted,
                    isActive && styles.stepLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  stepsContainer: {
    gap: 0,
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepColumn: {
    alignItems: 'center',
    width: 40,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.gray[300],
  },
  stepCircleCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 40,
    backgroundColor: Colors.gray[300],
    marginVertical: 4,
  },
  stepLineCompleted: {
    backgroundColor: Colors.success,
  },
  stepLabelContainer: {
    flex: 1,
    paddingLeft: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  stepLabel: {
    fontSize: FontSizes.sm,
    fontFamily: 'Poppins-Regular',
    color: Colors.gray[500],
  },
  stepLabelCompleted: {
    color: Colors.gray[700],
    fontFamily: 'Poppins-Medium',
  },
  stepLabelActive: {
    color: Colors.primary,
    fontFamily: 'Poppins-SemiBold',
    fontSize: FontSizes.md,
  },
});
