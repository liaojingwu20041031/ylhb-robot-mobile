import { StyleSheet, Text, View } from 'react-native';
import { DebugStatus } from '../../api/types';

type Props = {
  status?: DebugStatus;
};

export function DebugStatusCard({ status }: Props) {
  const topics = status?.topics ?? {};
  const nodes = status?.nodes ?? {};
  return (
    <View style={styles.card}>
      <Text style={styles.title}>系统检查</Text>
      <View style={styles.grid}>
        {['/cmd_vel', '/odom', '/scan', '/map'].map((topic) => (
          <Text key={topic} style={styles.item}>
            {topic}: {topics[topic] ? '可用' : '不可用'}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {[
          'zlac8015d_canopen_controller',
          'slam_toolbox',
          'bt_navigator',
          'controller_server',
          'planner_server',
          'amcl',
        ].map((node) => (
          <Text key={node} style={styles.item}>
            {node}: {nodes[node] ? '存在' : '未发现'}
          </Text>
        ))}
      </View>
      <Text style={styles.meta}>last_odom_age_sec: {status?.lastOdomAgeSec ?? '-'}</Text>
      <Text style={styles.meta}>last_scan_age_sec: {status?.lastScanAgeSec ?? '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d7de',
    backgroundColor: '#fff',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17202a',
  },
  grid: {
    gap: 6,
  },
  item: {
    color: '#344054',
  },
  meta: {
    color: '#667085',
    fontSize: 12,
  },
});
