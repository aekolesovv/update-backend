module.exports = {
    env: {
        node: true,
        es2021: true,
    },
    extends: ['airbnb-base', 'plugin:prettier/recommended'],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        // Настройки для табов размером 4
        indent: ['error', 4, { SwitchCase: 1 }],
        'no-tabs': 'error',

        // Дополнительные правила для Node.js
        'no-console': 'off',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'prefer-const': 'error',
        'no-var': 'error',

        // Правила для импортов
        'import/order': [
            'error',
            {
                groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                'newlines-between': 'always',
                alphabetize: {
                    order: 'asc',
                    caseInsensitive: true,
                },
            },
        ],

        // Отключение конфликтующих с Prettier правил
        'max-len': 'off',
        'operator-linebreak': 'off',
        'function-paren-newline': 'off',
        'object-curly-newline': 'off',
        'array-element-newline': 'off',

        // Отключение правил, которые не подходят для данного проекта
        camelcase: 'off', // Отключаем проверку camelCase для полей БД
        'consistent-return': 'off', // Отключаем требование возврата значения
        'no-underscore-dangle': 'off', // Разрешаем подчеркивания в именах
        'global-require': 'off', // Разрешаем require() в любом месте
        radix: 'off', // Отключаем требование radix для parseInt
    },
    plugins: ['prettier'],
};
