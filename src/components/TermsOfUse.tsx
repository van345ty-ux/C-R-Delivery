import React from 'react';
import { X, FileText, ShoppingCart, AlertTriangle, CreditCard, Scale, Phone, Mail } from 'lucide-react';

interface TermsOfUseProps {
  onClose: () => void;
}

export const TermsOfUse: React.FC<TermsOfUseProps> = ({ onClose }) => {
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
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-white/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Termos de Uso</h2>
              <p className="text-xs text-blue-200">Última atualização: {lastUpdated}</p>
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
              Bem-vindo(a) à plataforma de delivery da <strong>C&R Sushi</strong>. Ao acessar ou utilizar nossos
              serviços, você concorda integralmente com estes Termos de Uso. Leia com atenção antes de prosseguir.
            </p>
          </div>

          <TermSection icon={<FileText className="w-4 h-4" />} title="1. Aceitação dos Termos">
            <p className="text-sm">
              Ao se cadastrar na plataforma, realizar um pedido ou simplesmente navegar pelo sistema,
              você declara ter lido, compreendido e aceito estes Termos de Uso, bem como nossa
              Política de Privacidade. Se você não concordar com qualquer disposição, deverá
              interromper o uso imediatamente.
            </p>
          </TermSection>

          <TermSection icon={<FileText className="w-4 h-4" />} title="2. Sobre a C&R Sushi">
            <p className="text-sm">
              A C&R Sushi é um estabelecimento especializado em culinária japonesa, que oferece
              serviços de delivery e retirada no balcão. Nossa plataforma digital é o canal oficial
              para a realização de pedidos online.
            </p>
          </TermSection>

          <TermSection icon={<FileText className="w-4 h-4" />} title="3. Cadastro e conta de usuário">
            <ul className="space-y-2 text-sm">
              <li>O usuário deve ter no mínimo <strong>18 anos</strong> ou estar sob supervisão de um responsável legal para utilizar a plataforma.</li>
              <li>As informações fornecidas no cadastro (nome, e-mail, telefone, data de nascimento) devem ser <strong>verídicas e precisas</strong>.</li>
              <li>O usuário é responsável pela confidencialidade de sua senha e por todas as atividades realizadas em sua conta.</li>
              <li>É proibido criar contas com dados falsos, de terceiros ou com o intuito de fraudar o sistema.</li>
              <li>A C&R Sushi reserva-se o direito de suspender ou encerrar contas que violem estes Termos.</li>
            </ul>
          </TermSection>

          <TermSection icon={<ShoppingCart className="w-4 h-4" />} title="4. Realização de pedidos">
            <ul className="space-y-2 text-sm">
              <li>Os pedidos só podem ser realizados durante o <strong>horário de funcionamento</strong> do estabelecimento, exibido na plataforma.</li>
              <li>O <strong>pré-pedido</strong> está disponível entre 07h00 e 17h00, em dias em que o estabelecimento abrirá posteriormente. O pré-pedido é uma intenção de compra confirmada para entrega no período de funcionamento.</li>
              <li>Após a confirmação, o pedido é enviado à cozinha e <strong>não pode ser cancelado</strong> sem contato direto com o estabelecimento.</li>
              <li>Os preços exibidos na plataforma são em Reais (R$) e já incluem os tributos aplicáveis, podendo ser alterados sem aviso prévio.</li>
              <li>A disponibilidade dos itens está sujeita ao estoque e à operação do dia.</li>
            </ul>
          </TermSection>

          <TermSection icon={<CreditCard className="w-4 h-4" />} title="5. Pagamentos">
            <ul className="space-y-2 text-sm">
              <li><strong>Pix:</strong> pagamento instantâneo. O pedido será confirmado após a comprovação do pagamento.</li>
              <li><strong>Cartão:</strong> processado via maquininha no momento da entrega ou retirada, conforme disponibilidade.</li>
              <li><strong>Dinheiro:</strong> aceito na entrega. Informações sobre troco devem ser indicadas no campo correspondente.</li>
              <li><strong>Mercado Pago:</strong> processamento online via link de pagamento. Sujeito às políticas da plataforma Mercado Pago.</li>
              <li>Em caso de divergência no pagamento, entre em contato conosco pelo WhatsApp para resolução.</li>
            </ul>
          </TermSection>

          <TermSection icon={<FileText className="w-4 h-4" />} title="6. Entrega e retirada">
            <ul className="space-y-2 text-sm">
              <li>O <strong>prazo de entrega</strong> é estimado e pode variar conforme demanda, tráfego e condições climáticas.</li>
              <li>A <strong>taxa de entrega</strong> é calculada com base na localização e está sujeita a alterações.</li>
              <li>O usuário é responsável por fornecer o <strong>endereço correto</strong> de entrega. Erros de endereço não geram reembolso automático.</li>
              <li>Em caso de ausência no local de entrega, a C&R Sushi não se responsabiliza pela não conclusão da entrega.</li>
              <li>Para <strong>retirada no balcão</strong>, o usuário deve comparecer dentro do prazo estimado. Após 30 minutos do horário previsto, o pedido poderá ser descartado.</li>
            </ul>
          </TermSection>

          <TermSection icon={<FileText className="w-4 h-4" />} title="7. Cupons e promoções">
            <ul className="space-y-2 text-sm">
              <li>Cupons de desconto são pessoais e intransferíveis, salvo indicação contrária.</li>
              <li><strong>Cupom de Aniversário:</strong> gerado automaticamente para usuários cadastrados com data de nascimento válida, válido apenas durante o mês de aniversário.</li>
              <li><strong>Cupom de Fidelidade:</strong> concedido a critério da C&R Sushi com base no histórico de compras.</li>
              <li>Promoções podem ter <strong>prazo de validade</strong> e quantidade limitada. Verificar condições específicas de cada oferta.</li>
              <li>É proibido o uso fraudulento de cupons. Contas suspeitas de abuso serão suspensas.</li>
            </ul>
          </TermSection>

          <TermSection icon={<AlertTriangle className="w-4 h-4" />} title="8. Responsabilidades do usuário">
            <ul className="space-y-2 text-sm">
              <li>Utilizar a plataforma apenas para fins lícitos e de acordo com estes Termos.</li>
              <li>Não tentar acessar áreas restritas da plataforma (como o painel administrativo) sem autorização.</li>
              <li>Não utilizar scripts, bots ou mecanismos automatizados para interagir com a plataforma.</li>
              <li>Não reproduzir, copiar ou distribuir conteúdo da plataforma sem autorização expressa.</li>
              <li>Informar eventuais falhas ou vulnerabilidades encontradas, sem explorá-las.</li>
            </ul>
          </TermSection>

          <TermSection icon={<AlertTriangle className="w-4 h-4" />} title="9. Limitação de responsabilidade">
            <ul className="space-y-2 text-sm">
              <li>A C&R Sushi não se responsabiliza por falhas temporárias de acesso à plataforma decorrentes de manutenção, falhas de internet ou de terceiros.</li>
              <li>Não nos responsabilizamos por danos indiretos, incidentais ou consequentes decorrentes do uso da plataforma.</li>
              <li>Nos esforçamos para manter a disponibilidade contínua do serviço, mas não garantimos disponibilidade ininterrupta.</li>
            </ul>
          </TermSection>

          <TermSection icon={<FileText className="w-4 h-4" />} title="10. Propriedade intelectual">
            <p className="text-sm">
              Todo o conteúdo da plataforma — incluindo logotipos, identidade visual, textos, imagens e código-fonte —
              é propriedade exclusiva da C&R Sushi ou de seus licenciadores, protegido pelas leis de propriedade
              intelectual vigentes no Brasil. Qualquer uso não autorizado está sujeito às penalidades legais cabíveis.
            </p>
          </TermSection>

          <TermSection icon={<Scale className="w-4 h-4" />} title="11. Lei aplicável e foro">
            <p className="text-sm">
              Estes Termos são regidos pela legislação brasileira, especialmente pelo{' '}
              <strong>Código de Defesa do Consumidor (Lei nº 8.078/1990)</strong>, pelo{' '}
              <strong>Marco Civil da Internet (Lei nº 12.965/2014)</strong> e pela{' '}
              <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)</strong>.
              Para resolução de conflitos, fica eleito o foro da comarca do estabelecimento, com renúncia a qualquer outro.
            </p>
          </TermSection>

          <TermSection icon={<FileText className="w-4 h-4" />} title="12. Alterações nos Termos">
            <p className="text-sm">
              A C&R Sushi reserva-se o direito de modificar estes Termos a qualquer momento.
              As alterações entrarão em vigor após a publicação na plataforma. O uso contínuo após as mudanças
              implica na aceitação dos novos Termos.
            </p>
          </TermSection>

          <TermSection icon={<Mail className="w-4 h-4" />} title="13. Contato e SAC">
            <p className="text-sm mb-3">
              Para dúvidas, reclamações ou sugestões relacionadas a estes Termos ou ao nosso serviço:
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" style={{ color: '#DC2626' }} />
                <span>WhatsApp: <strong>(73) 99974-3274</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: '#DC2626' }} />
                <span>E-mail: <strong>djatila.azevedo@gmail.com</strong></span>
              </div>
            </div>
          </TermSection>

          <div
            className="rounded-xl p-4 text-center text-xs"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
          >
            Você também pode consultar seus direitos como consumidor no{' '}
            <strong>Procon</strong> ou acessar <strong>www.consumidor.gov.br</strong>.
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
            style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
          >
            Li e Aceito os Termos
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper Section component
const TermSection: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
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
