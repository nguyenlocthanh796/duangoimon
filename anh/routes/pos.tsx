import POSOrderScreen from '../../lib/components/pos/POSOrderScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function POSScreen() {
  const { tableId, tableName } = useLocalSearchParams<{ tableId: string; tableName: string }>();
  const router = useRouter();

  return (
    <POSOrderScreen
      tableId={tableId || ''}
      tableName={tableName ? decodeURIComponent(tableName) : ''}
      onClose={() => router.replace('/ban-hang')}
    />
  );
}
