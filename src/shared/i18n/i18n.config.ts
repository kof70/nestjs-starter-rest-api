import { I18nOptions } from 'nestjs-i18n';
import * as path from 'path';

/**
 * Configuration for nestjs-i18n module
 * Requirements: 9.1, 9.7
 */
export function getI18nConfig(): I18nOptions {
  return {
    fallbackLanguage: 'en',
    loaderOptions: {
      path: path.join(__dirname, '../../i18n/'),
      watch: true,
    },
  };
}
