import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { tKey } from '../store/helpers';
import type { Dict, Language } from '../i18n/translations';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

function currentLanguage(): Language {
  try {
    return useStore.getState().language;
  } catch (e) {
    console.error('[spire] language lookup failed in error boundary', e);
    return 'en';
  }
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[spire] uncaught render error', error, info.componentStack);
    try {
      useStore.getState().addLog('render error: ' + error.message);
    } catch (e) {
      console.error('[spire] could not record render error', e);
    }
  }

  private reload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    const language = currentLanguage();
    const t = (key: string) => tKey(language, key as keyof Dict);
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        padding: 24, background: 'var(--surface-0)', textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 32, background: 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={28} color="var(--accent)" />
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
          {t('error_title')}
        </h1>
        <p style={{ margin: 0, maxWidth: 440, fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
          {t('error_desc')}
        </p>
        <code style={{
          maxWidth: 560, overflowWrap: 'anywhere', fontSize: 12,
          color: 'var(--text-tertiary)',
        }}>
          {error.message}
        </code>
        <button
          type="button"
          onClick={this.reload}
          style={{
            marginTop: 8, padding: '10px 20px', borderRadius: 10, border: 'none',
            background: 'var(--accent)', color: 'var(--on-accent)',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {t('error_reload')}
        </button>
      </div>
    );
  }
}
