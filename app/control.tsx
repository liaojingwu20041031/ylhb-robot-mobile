import { PageContainer } from '../src/components/PageContainer';
import { ControlPad } from '../src/components/ControlPad';

export default function ControlPage() {
  return (
    <PageContainer title="手动控制" subtitle="短时低速控制，危险情况请立即急停">
      <ControlPad />
    </PageContainer>
  );
}
