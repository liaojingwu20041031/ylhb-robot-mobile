import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { robotActions } from '../../store/robotStore';

export function MappingTestPanel() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>建图测试</Text>
      <Text style={styles.notice}>建图测试必须确保机器人周围安全。</Text>
      <View style={styles.row}>
        <Button label="检查依赖" onPress={() => robotActions.mappingStatus()} />
        <Button label="启动建图" onPress={() => robotActions.startMapping()} />
      </View>
      <View style={styles.row}>
        <Button label="保存地图" onPress={() => robotActions.saveMapping({ map_name: 'my_map' })} />
        <Button label="停止建图" onPress={() => robotActions.stopMapping()} neutral />
      </View>
    </View>
  );
}

function Button({ label, onPress, neutral }: { label: string; onPress: () => void; neutral?: boolean }) {
  return (
    <TouchableOpacity style={[styles.button, neutral && styles.neutral]} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
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
  },
  notice: {
    color: '#9a6700',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#0969da',
  },
  neutral: {
    backgroundColor: '#57606a',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
  },
});
