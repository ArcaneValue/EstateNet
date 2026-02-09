import React from 'react';
import { ComingSoonScreen } from '../../components/ComingSoonScreen';

export const IncomeStatementScreen: React.FC<any> = () => {
    return (
        <ComingSoonScreen
            title="Income Statement"
            subtitle="View revenue and expenses."
            icon="document-text"
        />
    );
};

