import React from 'react';
import { ComingSoonScreen } from '../../components/ComingSoonScreen';

export const OutstandingRentScreen: React.FC<any> = () => {
    return (
        <ComingSoonScreen
            title="Outstanding Rent"
            subtitle="Track overdue payments and send reminders."
            icon="cash-outline"
        />
    );
};
