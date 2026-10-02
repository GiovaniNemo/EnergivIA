| id     | task                                                                           | status    | notes                                                                |
| ------ | ------------------------------------------------------------------------------ | --------- | -------------------------------------------------------------------- |
| task-1 | Adicionar campo de texto companyName na configuração de Capa (Cover.config.ts) | completed | Campo adicionado no grupo Branding com visibleWhen: showCompanyName  |
| task-2 | Suportar placeholder em DynamicField e renderizador de texto do editor         | completed | Interface DynamicField e renderTextField atualizados com placeholder |
| task-3 | Atualizar PreviewDocument para priorizar companyName da capa se definido       | completed | coverContent.companyName prioriza o valor customizado da capa        |
| task-4 | Atualizar Cover.tsx para apontar data-editor-field-path para companyName       | completed | Ao clicar no nome no preview, foca o campo de edição do nome         |
| task-5 | Atualizar schemas de seção e default fields                                    | completed | section-fields.ts e template-assistant-field-schema.ts atualizados   |
| task-6 | Testar e verificar build/lint e comportamento visual                           | completed | TypeScript e Vitest passaram (11 test files, 89 tests passed)        |
| task-7 | Commit e push das alterações                                                   | completed | Commit 3276234 enviado para origin/main                              |
