# Revisão das funções antigas de cupons de aniversário

Estado: diagnóstico somente leitura preparado; nenhuma permissão alterada.

O frontend não chama `generate_birthday_coupons()` nem
`generate_birthday_coupons_scheduled()`. O painel administrativo cria cupons de
aniversário diretamente na tabela, sujeito às políticas administrativas já
revisadas. A auditoria anterior mostrou que ambas as funções ainda podem ser
executadas por PUBLIC, anon e authenticated; a primeira usa SECURITY DEFINER.

Antes de revogar acessos é necessário conferir os corpos exatos, a relação entre
as duas funções, eventuais gatilhos e a presença de infraestrutura de agendamento.
`AUDITAR_FUNCOES_ANIVERSARIO.sql` faz essa coleta sem executar funções, sem ler
clientes e sem mostrar comandos armazenados de cron.
