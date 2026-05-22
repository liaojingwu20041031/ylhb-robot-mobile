import { ControlPad } from '../src/components/ControlPad';
import { PageContainer } from '../src/components/PageContainer';
import { SectionCard } from '../src/components/SectionCard';

export default function ControlPage() {
  return (
    <PageContainer title="底盘控制" subtitle="低速点动测试，危险情况请立即急停。">
      <SectionCard title="点动控制" description="带控制锁、状态过期禁用和 200ms 命令节流。">
        <ControlPad />
      </SectionCard>
    </PageContainer>
  );
}
