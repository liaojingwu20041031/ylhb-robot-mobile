import { View } from 'react-native';
import { HelpText } from '../src/components/HelpText';
import { PageContainer } from '../src/components/PageContainer';
import { SectionCard } from '../src/components/SectionCard';
import { TaskButton } from '../src/components/TaskButton';
import { robotActions, useRobotStore } from '../src/store/robotStore';

const send = (text: string) => robotActions.sendTextCommand(text);

export default function TasksPage() {
  const pending = useRobotStore((snapshot) => snapshot.pending);
  return (
    <PageContainer title="零售任务" subtitle="中文自然语言命令发送到机器人任务层。">
      <HelpText tone="warning">
        真机模式下任务可能触发移动或执行机构动作。发送前请确认机器人周围安全，并保持全局 STOP 可触达。
      </HelpText>
      <SectionCard title="区域移动" description="区域移动命令会发送到 /retail_ai/text_command，由任务层解释执行。">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <TaskButton label="去起点区" commandText="请移动到起点区" loading={pending.task} onPress={() => send('请移动到起点区')} />
          <TaskButton label="去货架区" commandText="请移动到货架区" loading={pending.task} onPress={() => send('请移动到货架区')} />
          <TaskButton label="去结算区" commandText="请移动到结算区" loading={pending.task} onPress={() => send('请移动到结算区')} />
        </View>
      </SectionCard>
      <SectionCard title="商品取货" description="商品取货命令以中文文本方式提交，不改变后端协议。">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <TaskButton label="拿可乐" commandText="帮我拿一瓶可乐" loading={pending.task} onPress={() => send('帮我拿一瓶可乐')} />
          <TaskButton label="拿矿泉水" commandText="帮我拿一瓶矿泉水" loading={pending.task} onPress={() => send('帮我拿一瓶矿泉水')} />
          <TaskButton label="拿橙汁" commandText="帮我拿一瓶橙汁" loading={pending.task} onPress={() => send('帮我拿一瓶橙汁')} />
          <TaskButton label="拿薯片" commandText="帮我拿一包薯片" loading={pending.task} onPress={() => send('帮我拿一包薯片')} />
        </View>
      </SectionCard>
      <SectionCard title="任务控制" description="危险操作会突出显示，请避免重复点击。">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <TaskButton label="停止当前任务" commandText="POST /api/stop" topic="/api/stop" danger loading={pending.stop} onPress={() => robotActions.stop()} />
          <TaskButton label="返回起点" commandText="请返回起点区" warning loading={pending.task} onPress={() => send('请返回起点区')} />
        </View>
      </SectionCard>
    </PageContainer>
  );
}
