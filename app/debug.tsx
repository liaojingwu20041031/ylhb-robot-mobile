import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../src/components/AppButton';
import { ChassisTestPanel } from '../src/components/debug/ChassisTestPanel';
import { DebugLogPanel } from '../src/components/debug/DebugLogPanel';
import { DebugStatusCard } from '../src/components/debug/DebugStatusCard';
import { MappingTestPanel } from '../src/components/debug/MappingTestPanel';
import { NavigationTestPanel } from '../src/components/debug/NavigationTestPanel';
import { FreshnessBadge } from '../src/components/FreshnessBadge';
import { HelpText } from '../src/components/HelpText';
import { PageContainer } from '../src/components/PageContainer';
import { SectionCard } from '../src/components/SectionCard';
import { StatusCard } from '../src/components/StatusCard';
import { colors } from '../src/theme/consoleTheme';
import { robotActions, useRobotStore } from '../src/store/robotStore';

export default function DebugPage() {
  const { debugStatus, pending } = useRobotStore((snapshot) => ({
    debugStatus: snapshot.debugStatus,
    pending: snapshot.pending,
  }));
  const [text, setText] = useState('帮我拿一瓶可乐');

  useEffect(() => {
    robotActions.refreshDebugStatus();
  }, []);

  return (
    <PageContainer title="调试中心" subtitle="系统检查、底盘、雷达里程计、建图、导航和任务层测试。">
      <DebugStatusCard status={debugStatus} />
      <ChassisTestPanel />
      <SectionCard title="雷达与里程计检查" description="检查 /scan 和 /odom 更新时间，必要时排查 scan filter。">
        <View style={styles.grid}>
          <StatusCard title="/scan 更新时间" value={debugStatus?.lastScanAgeSec} />
          <StatusCard title="/odom 更新时间" value={debugStatus?.lastOdomAgeSec} />
          <StatusCard title="雷达 range_min" value={debugStatus?.scanRangeMin} />
          <StatusCard title="雷达 range_max" value={debugStatus?.scanRangeMax} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <FreshnessBadge age={debugStatus?.lastScanAgeSec} />
          <FreshnessBadge age={debugStatus?.lastOdomAgeSec} />
        </View>
        <HelpText tone="warning">如果车体柱子影响建图，请检查 scan filter、雷达安装位置和过滤参数。</HelpText>
      </SectionCard>
      <MappingTestPanel />
      <NavigationTestPanel />
      <SectionCard title="任务层测试" description="显示零售任务状态，并提供测试文本命令输入框。">
        <View style={styles.grid}>
          <StatusCard title="/retail_ai/system_mode" value={debugStatus?.systemMode} />
          <StatusCard title="/retail_ai/task_status" value={debugStatus?.taskStatus} />
          <StatusCard title="/retail_ai/sales_dialogue_status" value={debugStatus?.salesDialogueStatus} />
          <StatusCard title="/retail_ai/cart" value={debugStatus?.cart} />
        </View>
        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>测试文本命令</Text>
          <TextInput style={styles.input} value={text} onChangeText={setText} placeholderTextColor={colors.textSubtle} />
        </View>
        <AppButton label="发送测试文本命令" loading={pending.task} onPress={() => robotActions.sendTextCommand(text)} />
      </SectionCard>
      <DebugLogPanel />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  inputBox: {
    gap: 5,
  },
  inputLabel: {
    color: colors.textMuted,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.input,
    color: colors.text,
  },
});
