import { StyleSheet, View } from 'react-native';
import { PageContainer } from '../src/components/PageContainer';
import { TaskButton } from '../src/components/TaskButton';
import { robotActions } from '../src/store/robotStore';

const taskText = (text: string) => robotActions.sendTextCommand(text);

export default function TasksPage() {
  return (
    <PageContainer title="零售任务" subtitle="第一版任务转中文自然语言发送到机器人任务层">
      <View style={styles.grid}>
        <TaskButton label="去起点区" onPress={() => taskText('请移动到起点区')} />
        <TaskButton label="去货架区" onPress={() => taskText('请移动到货架区')} />
        <TaskButton label="去结算区" onPress={() => taskText('请移动到结算区')} />
        <TaskButton label="拿可乐" onPress={() => taskText('帮我拿一瓶可乐')} />
        <TaskButton label="拿矿泉水" onPress={() => taskText('帮我拿一瓶矿泉水')} />
        <TaskButton label="拿橙汁" onPress={() => taskText('帮我拿一瓶橙汁')} />
        <TaskButton label="停止任务" danger onPress={() => robotActions.stop()} />
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 10,
  },
});
