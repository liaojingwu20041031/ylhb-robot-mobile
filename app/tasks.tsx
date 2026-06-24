import { View } from 'react-native';
import { HelpText } from '../src/components/HelpText';
import { PageContainer } from '../src/components/PageContainer';
import { PatrolExecutorPanel } from '../src/components/debug/PatrolExecutorPanel';
import { SectionCard } from '../src/components/SectionCard';
import { TaskButton } from '../src/components/TaskButton';
import { robotActions, useRobotStore } from '../src/store/robotStore';

const send = (text: string) => robotActions.sendTextCommand(text);

export default function TasksPage() {
  const pending = useRobotStore((snapshot) => snapshot.pending);
  return (
    <PageContainer title="巡逻控制" subtitle="本地巡逻状态机控制与测试文本命令。">
      <HelpText tone="info">
        巡逻执行由机器人本地 patrol_executor_node 自主完成，本页仅用于状态查看与控制；路线文件渲染见「导航路线」页。
      </HelpText>
      <PatrolExecutorPanel />
      <SectionCard
        title="任务事件测试"
        description="测试文本命令发送到 /inspection_ai/text_command，仅用于任务层联调，巡逻控制以上方面板为准。"
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <TaskButton label="开始巡检" commandText="开始巡检任务" loading={pending.task} onPress={() => send('开始巡检任务')} />
          <TaskButton label="暂停巡检" commandText="暂停巡检任务" loading={pending.task} onPress={() => send('暂停巡检任务')} />
          <TaskButton label="恢复巡检" commandText="恢复巡检任务" loading={pending.task} onPress={() => send('恢复巡检任务')} />
          <TaskButton label="巡检查询" commandText="查询当前巡检状态" loading={pending.task} onPress={() => send('查询当前巡检状态')} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <TaskButton label="巡检 1 号点" commandText="前往 1 号巡检点" loading={pending.task} onPress={() => send('前往 1 号巡检点')} />
          <TaskButton label="巡检 2 号点" commandText="前往 2 号巡检点" loading={pending.task} onPress={() => send('前往 2 号巡检点')} />
          <TaskButton label="人工接管" commandText="人工接管" warning loading={pending.task} onPress={() => send('人工接管')} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <TaskButton label="停止当前任务" commandText="POST /api/stop" topic="/api/stop" danger loading={pending.stop} onPress={() => robotActions.stop()} />
          <TaskButton label="取消巡检" commandText="取消巡检任务" warning loading={pending.task} onPress={() => send('取消巡检任务')} />
        </View>
      </SectionCard>
    </PageContainer>
  );
}
