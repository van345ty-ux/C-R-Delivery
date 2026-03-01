-- =====================================================
-- Script SQL: Criar Tabela login_notifications
-- Descrição: Habilita notificações de login de clientes para admins
-- =====================================================

-- 1. Criar tabela login_notifications
CREATE TABLE IF NOT EXISTS public.login_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_login_notifications_created_at 
ON public.login_notifications(created_at DESC);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.login_notifications ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Admins can read all login notifications" ON public.login_notifications;
DROP POLICY IF EXISTS "Users can insert their own login notifications" ON public.login_notifications;
DROP POLICY IF EXISTS "Admins can delete login notifications" ON public.login_notifications;

-- 5. Criar política: Admins podem ler todas as notificações
CREATE POLICY "Admins can read all login notifications"
ON public.login_notifications
FOR SELECT
TO authenticated
USING (get_my_role() = 'admin');

-- 6. Criar política: Usuários autenticados podem inserir suas próprias notificações
CREATE POLICY "Users can insert their own login notifications"
ON public.login_notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 7. Criar política: Admins podem deletar notificações antigas
CREATE POLICY "Admins can delete login notifications"
ON public.login_notifications
FOR DELETE
TO authenticated
USING (get_my_role() = 'admin');

-- 8. Habilitar Realtime para a tabela (necessário para notificações em tempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_notifications;

-- 9. (OPCIONAL) Função para limpeza automática de notificações antigas
-- Deleta notificações com mais de 1 hora
CREATE OR REPLACE FUNCTION cleanup_old_login_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.login_notifications
  WHERE created_at < NOW() - INTERVAL '1 hour';
  
  RAISE NOTICE 'Deleted old login notifications';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Comentários para documentação
COMMENT ON TABLE public.login_notifications IS 'Armazena notificações de login de clientes para exibir no painel admin';
COMMENT ON COLUMN public.login_notifications.user_id IS 'ID do usuário que fez login (referência para auth.users)';
COMMENT ON COLUMN public.login_notifications.user_name IS 'Nome do usuário que fez login';
COMMENT ON COLUMN public.login_notifications.created_at IS 'Data e hora do login';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- INSTRUÇÕES DE USO:
-- 1. Copie todo este script
-- 2. Acesse o Supabase Dashboard → SQL Editor
-- 3. Cole o script e clique em "Run"
-- 4. Verifique se não há erros
-- 5. Teste fazendo login com um cliente enquanto admin está logado

-- LIMPEZA MANUAL (se necessário):
-- Para limpar notificações antigas manualmente, execute:
-- SELECT cleanup_old_login_notifications();

-- VERIFICAÇÃO:
-- Para verificar se a tabela foi criada corretamente:
-- SELECT * FROM public.login_notifications ORDER BY created_at DESC LIMIT 10;
