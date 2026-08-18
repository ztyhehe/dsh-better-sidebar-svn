import type { BetterSidebarService } from 'dsh-better-sidebar';
import type { SessionScope } from './api.ts';
export interface SvnViewProps {
    scope: SessionScope;
    betterSidebar: BetterSidebarService;
    onOpenFile: (path: string) => void;
}
export declare function SvnView(props: SvnViewProps): import("react").JSX.Element;
//# sourceMappingURL=SvnView.d.ts.map