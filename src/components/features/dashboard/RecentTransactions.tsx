import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, FileText, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  type: 'approval' | 'rejection' | 'bulk' | 'upload';
  message: string;
  time: string;
}

const dummyTransactions: Transaction[] = [
  {
    id: '1',
    type: 'approval',
    message: 'INV-2026-003 (Mopaş) Approved.',
    time: '14:22',
  },
  {
    id: '2',
    type: 'rejection',
    message: 'INV-2026-002 (Gratis) Rejected: Payment overrun.',
    time: '14:20',
  },
  {
    id: '3',
    type: 'approval',
    message: 'INV-2026-001 (Migros) Approved.',
    time: '14:15',
  },
  {
    id: '4',
    type: 'bulk',
    message: '3 invoices sent for approval.',
    time: '10:30',
  },
  {
    id: '5',
    type: 'upload',
    message: '2026-01 Sales Data processed.',
    time: '14:00',
  },
];

const getTransactionIcon = (type: Transaction['type']) => {
  switch (type) {
    case 'approval':
      return <CheckCircle2 className="h-4 w-4 text-success-600" />;
    case 'rejection':
      return <XCircle className="h-4 w-4 text-error-600" />;
    case 'bulk':
      return <FileText className="h-4 w-4 text-primary-600" />;
    case 'upload':
      return <Upload className="h-4 w-4 text-primary-600" />;
    default:
      return <FileText className="h-4 w-4 text-gray-600" />;
  }
};

const getTransactionLabel = (type: Transaction['type']) => {
  switch (type) {
    case 'approval':
      return 'Invoice Approval';
    case 'rejection':
      return 'Invoice Rejection';
    case 'bulk':
      return 'Bulk Invoice Entry';
    case 'upload':
      return 'CSV Upload';
    default:
      return 'Transaction';
  }
};

export function RecentTransactions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dummyTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="mt-0.5">
                {getTransactionIcon(transaction.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500">
                    {getTransactionLabel(transaction.type)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {transaction.time}
                  </span>
                </div>
                <p className="text-sm text-gray-900">{transaction.message}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

