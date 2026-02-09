import React from 'react';
import { ComingSoonScreen } from '../../components/ComingSoonScreen';

export const CashflowStatementScreen: React.FC<any> = () => {
    return (
        <ComingSoonScreen
            title="Cashflow Statement"
            subtitle="View cash inflows and outflows."
            icon="cash-outline"
        />
    );
};
