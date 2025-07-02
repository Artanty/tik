interface IConfigConstraints {
  maxLength: number;
  allowedPattern: RegExp;
  disallowedSubstrings: string[]
}

export class ConfigValidationError extends Error {
  constructor(public rule: string, message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export function validateConfig(config: unknown, isJsonString = false): asserts config is string {
  const constraints: IConfigConstraints = {
    maxLength: 1024,
    allowedPattern: /^[a-zA-Z0-9_\-=.,:;!@#$%^&*()+?/\\[\]{}|<> ]+$/,
    disallowedSubstrings: ['<script>', 'eval(', 'function(']
  };

  // Type check
  if (typeof config !== 'string') {
    throw new ConfigValidationError(
      'INVALID_TYPE',
      `Config must be a string, received ${typeof config}`
    );
  }

  // Length check
  if (config.length > constraints.maxLength) {
    throw new ConfigValidationError(
      'MAX_LENGTH_EXCEEDED',
      `Config exceeds maximum length of ${constraints.maxLength} characters`
    );
  }

  // Character whitelist
  if (!constraints.allowedPattern.test(config)) {
    throw new ConfigValidationError(
      'INVALID_CHARACTERS',
      'Config contains disallowed characters'
    );
  }

  // Security checks
  for (const substring of constraints.disallowedSubstrings) {
    if (config.includes(substring)) {
      throw new ConfigValidationError(
        'DISALLOWED_CONTENT',
        `Config contains forbidden sequence: ${substring}`
      );
    }
  }

  if (isJsonString && (config.startsWith('{') || config.startsWith('['))) {
    try {
      JSON.parse(config);
    } catch {
      throw new ConfigValidationError(
        'INVALID_JSON',
        'Config appears to be malformed JSON'
      );
    }
  }
}