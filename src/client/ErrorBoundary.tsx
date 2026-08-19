/**
 * 渲染错误边界：包住 SvnView / SvnDiffTab，
 * 渲染异常时显示可读错误占位而不是整个侧边栏白屏。
 * 与 React 官方 ErrorBoundary 模式一致（class component 捕获子树渲染期错误）。
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** 出错占位里的模块名（便于定位哪一半渲染失败）。 */
  label?: string
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[dsh-better-sidebar-svn] ${this.props.label ?? 'view'} render failed`, error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <div className="svn-error-boundary">
          <div className="svn-error-boundary-title">SVN 面板渲染出错</div>
          <div className="svn-error-boundary-message">{this.state.error.message}</div>
          <button
            type="button"
            className="svn-btn svn-btn-primary"
            onClick={() => { this.setState({ error: null }) }}
          >
            重试渲染
          </button>
        </div>
      )
    }
    return this.props.children
  }
}