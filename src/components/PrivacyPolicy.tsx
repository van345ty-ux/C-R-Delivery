import React from 'react';
import { X, Shield, Eye, Lock, Trash2, Mail, Phone } from 'lucide-react';

interface PrivacyPolicyProps {
  onClose: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onClose }) => {
  const lastUpdated = '17 de maio de 2025';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--bg-primary)',
          maxHeight: '90vh',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-white/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Política de Privacidade</h2>
              <p className="text-xs text-red-200">Última atualização: {lastUpdated}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6" style={{ color: 'var(--text-primary)' }}>

          {/* Intro */}
          <div
            className="rounded-xl p-4 text-sm leading-relaxed"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
          >
            <p>
              A <strong>C&R Sushi</strong> está comprometida com a proteção dos seus dados pessoais,
              em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
              Esta Política explica como coletamos, utilizamos, armazenamos e protegemos as suas informações.
            </p>
          </div>

          <Section icon={<Eye className="w-4 h-4" />} title="1. Quais dados coletamos">
            <ul className="space-y-2 text-sm">
              <li><strong>Dados cadastrais:</strong> nome completo, endereço de e-mail, número de telefone e data de nascimento, fornecidos no momento do cadastro.</li>
              <li><strong>Dados de pedido:</strong> itens adquiridos, endereço de entrega, forma de pagamento e histórico de compras.</li>
              <li><strong>Dados de localização:</strong> cidade selecionada para fins de cálculo de entrega e disponibilidade do serviço.</li>
              <li><strong>Dados de navegação:</strong> preferências salvas localmente (carrinho, última tela acessada) via <em>localStorage</em> do navegador.</li>
              <li><strong>Dados de uso:</strong> registros de login e interações com a plataforma, para fins de segurança e análise interna.</li>
            </ul>
          </Section>

          <Section icon={<Shield className="w-4 h-4" />} title="2. Finalidade do tratamento dos dados">
            <ul className="space-y-2 text-sm">
              <li><strong>Execução do contrato:</strong> processamento e entrega de pedidos realizados na plataforma.</li>
              <li><strong>Comunicação:</strong> confirmação de pedidos, envio de notificações sobre o status da entrega e comunicados sobre cupons e promoções exclusivas.</li>
              <li><strong>Fidelização:</strong> criação de cupons de aniversário e cupons de fidelidade baseados na contagem de compras.</li>
              <li><strong>Segurança:</strong> prevenção de fraudes, autenticação de usuários e integridade do sistema.</li>
              <li><strong>Melhoria do serviço:</strong> análise agregada de comportamento de uso para aprimorar a plataforma.</li>
            </ul>
          </Section>

          <Section icon={<Lock className="w-4 h-4" />} title="3. Base legal para o tratamento (LGPD, Art. 7º)">
            <ul className="space-y-2 text-sm">
              <li><strong>Execução de contrato</strong> (Art. 7º, V): tratamento necessário para a realização do pedido.</li>
              <li><strong>Consentimento</strong> (Art. 7º, I): para envio de comunicações de marketing e promoções.</li>
              <li><strong>Legítimo interesse</strong> (Art. 7º, IX): para fins de segurança, prevenção a fraudes e melhoria do serviço.</li>
              <li><strong>Cumprimento de obrigação legal</strong> (Art. 7º, II): quando exigido por legislação fiscal ou regulatória aplicável.</li>
            </ul>
          </Section>

          <Section icon={<Shield className="w-4 h-4" />} title="4. Compartilhamento de dados">
            <p className="text-sm mb-2">Não vendemos nem alugamos seus dados pessoais. Podemos compartilhá-los com:</p>
            <ul className="space-y-2 text-sm">
              <li><strong>Prestadores de serviço:</strong> plataformas de pagamento (ex.: Mercado Pago, operadoras de Pix) estritamente para processar transações.</li>
              <li><strong>Plataformas de mensageria:</strong> serviços de WhatsApp utilizados para comunicação sobre o status do pedido.</li>
              <li><strong>Infraestrutura de nuvem:</strong> Supabase (banco de dados e autenticação), que atua como operador e possui conformidade com padrões internacionais de segurança.</li>
              <li><strong>Autoridades públicas:</strong> quando exigido por lei ou ordem judicial.</li>
            </ul>
          </Section>

          <Section icon={<Lock className="w-4 h-4" />} title="5. Armazenamento e segurança">
            <ul className="space-y-2 text-sm">
              <li>Seus dados são armazenados em servidores seguros com criptografia em repouso e em trânsito (TLS/SSL).</li>
              <li>O acesso aos dados é restrito a colaboradores e sistemas autorizados.</li>
              <li>Adotamos Row-Level Security (RLS) no banco de dados para garantir que cada usuário acesse somente seus próprios dados.</li>
              <li>Senhas nunca são armazenadas em texto plano — utilizamos os mecanismos seguros da plataforma Supabase Auth.</li>
            </ul>
          </Section>

          <Section icon={<Trash2 className="w-4 h-4" />} title="6. Seus direitos como titular (LGPD, Art. 18)">
            <p className="text-sm mb-2">Você tem os seguintes direitos sobre seus dados pessoais:</p>
            <ul className="space-y-2 text-sm">
              <li><strong>Confirmação e acesso:</strong> saber quais dados tratamos e obter uma cópia.</li>
              <li><strong>Correção:</strong> solicitar a atualização de dados incompletos ou incorretos.</li>
              <li><strong>Eliminação:</strong> solicitar a exclusão de dados desnecessários ou tratados em desconformidade.</li>
              <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado.</li>
              <li><strong>Revogação do consentimento:</strong> retirar o consentimento a qualquer momento, sem prejuízo das operações já realizadas.</li>
              <li><strong>Oposição:</strong> se opor ao tratamento realizado com base em legítimo interesse.</li>
            </ul>
            <p className="text-sm mt-3">
              Para exercer seus direitos, entre em contato pelo WhatsApp ou e-mail indicados ao final deste documento.
            </p>
          </Section>

          <Section icon={<Eye className="w-4 h-4" />} title="7. Cookies e armazenamento local">
            <p className="text-sm">
              Utilizamos o <em>localStorage</em> do seu navegador para manter preferências de uso (como cidade selecionada e carrinho de compras).
              Esses dados são armazenados apenas no seu dispositivo e não são transmitidos a terceiros.
              Você pode limpá-los a qualquer momento nas configurações do seu navegador.
            </p>
          </Section>

          <Section icon={<Shield className="w-4 h-4" />} title="8. Retenção de dados">
            <p className="text-sm">
              Mantemos seus dados pessoais pelo tempo necessário para cumprir as finalidades descritas nesta Política
              ou conforme exigido por obrigações legais e fiscais. Dados de pedidos podem ser retidos por até 5 anos
              para fins de auditoria e obrigações tributárias. Após esse período, os dados serão anonimizados ou excluídos.
            </p>
          </Section>

          <Section icon={<Shield className="w-4 h-4" />} title="9. Menores de idade">
            <p className="text-sm">
              Nosso serviço não é destinado a menores de 18 anos sem o consentimento dos pais ou responsáveis.
              Se tomarmos conhecimento de que coletamos dados de menores sem autorização, procederemos com a exclusão imediata.
            </p>
          </Section>

          <Section icon={<Mail className="w-4 h-4" />} title="10. Encarregado de Proteção de Dados (DPO) e contato">
            <p className="text-sm mb-3">
              Para dúvidas, solicitações ou exercício dos seus direitos, entre em contato com nosso Encarregado de Dados (DPO):
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                <span>WhatsApp: <strong>(XX) XXXXX-XXXX</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                <span>E-mail: <strong>privacidade@crsushi.com.br</strong></span>
              </div>
            </div>
          </Section>

          <Section icon={<Shield className="w-4 h-4" />} title="11. Alterações nesta Política">
            <p className="text-sm">
              Esta Política pode ser atualizada periodicamente para refletir melhorias no nosso serviço ou mudanças
              na legislação. A data da última atualização sempre será indicada no topo deste documento.
              Alterações significativas serão comunicadas por meio da plataforma ou pelos canais de contato cadastrados.
            </p>
          </Section>

          <div
            className="rounded-xl p-4 text-center text-xs"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
          >
            Em caso de irregularidades, você também pode registrar uma reclamação junto à{' '}
            <strong className="underline">Autoridade Nacional de Proteção de Dados (ANPD)</strong> em{' '}
            <strong>www.gov.br/anpd</strong>.
          </div>
        </div>

        {/* Footer action */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
        >
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-300 hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)' }}
          >
            Entendi e Aceito
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper Section component
const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color: '#DC2626' }}>{icon}</span>
      <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
    </div>
    <div style={{ color: 'var(--text-secondary)', paddingLeft: '1.5rem' }}>
      {children}
    </div>
  </div>
);
