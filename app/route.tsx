import { HelpText } from '../src/components/HelpText';
import { PageContainer } from '../src/components/PageContainer';
import { RouteMapPanel } from '../src/components/debug/RouteMapPanel';

export default function RoutePage() {
  return (
    <PageContainer title="导航路线" subtitle="加载并渲染 route_patrol_*.json 路线文件，支持单点导航测试。">
      <HelpText tone="info">路线文件来自机器人端 /api/debug/route/active，Mock Mode 加载内置示例路线。</HelpText>
      <RouteMapPanel showManualNav />
    </PageContainer>
  );
}
