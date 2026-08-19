/**
 * 渲染错误边界：包住 SvnView / SvnDiffTab，
 * 渲染异常时显示可读错误占位而不是整个侧边栏白屏。
 * 与 React 官方 ErrorBoundary 模式一致（class component 捕获子树渲染期错误）。
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
interface ErrorBoundaryProps {
    children: ReactNode;
    /** 出错占位里的模块名（便于定位哪一半渲染失败）。 */
    label?: string;
}
interface ErrorBoundaryState {
    error: Error | null;
}
export declare class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): ErrorBoundaryState;
    componentDidCatch(error: Error, info: ErrorInfo): void;
    render(): ReactNode;
}
export {};
//# sourceMappingURL=ErrorBoundary.d.ts.map