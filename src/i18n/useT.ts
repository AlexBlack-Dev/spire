import { useStore } from '../store/useStore';
import { translations, type Dict } from './translations';

export function useT(): (key: keyof Dict) => string {
  const language = useStore((s) => s.language);
  return (key) => translations[language][key] || key;
}