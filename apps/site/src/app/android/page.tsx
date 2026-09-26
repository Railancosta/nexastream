export const metadata = {
  title: 'NexaStream Android — App nativo',
  description: 'App Android nativo da NexaStream: feed, shorts, player, upload, wallet NST e Creator Studio.'
}

export default function Android() {
  const capabilities = [
    { title: 'Autenticação', detail: 'Registro e login com JWT. Token guardado em EncryptedSharedPreferences (AES-256-GCM, chave no Android Keystore).' },
    { title: 'Feed e Shorts', detail: 'Feed ranqueado pelo backend (engajamento, conclusão, recência, jitter por espectador). Shorts em scroll vertical fullscreen.' },
    { title: 'Player', detail: 'ExoPlayer (Media3) com seleção de resolução a partir das renditions geradas no transcoding.' },
    { title: 'Upload', detail: 'Streaming direto dos bytes do arquivo para o backend, sem carregar o vídeo inteiro em memória. O backend faz ffprobe e classifica Short.' },
    { title: 'Wallet NST', detail: 'Saldo, ganhos por tipo, ledger recente e histórico de payouts.' },
    { title: 'Creator Studio', detail: 'Economia por vídeo: views, retenção, ganhos, receita por mil views e horas assistidas.' },
    { title: 'Payout', detail: 'Solicitação de saque com validação de endereço por rede, mínimo de 100 NST e timelock de 24h acima do limite.' },
  ]

  const stack = [
    ['Linguagem', 'Kotlin 2.0'],
    ['UI', 'Jetpack Compose (Material 3)'],
    ['Player', 'AndroidX Media3 / ExoPlayer'],
    ['Rede', 'HttpURLConnection + JSONObject (sem dependências pesadas)'],
    ['Segurança', 'EncryptedSharedPreferences + Keystore'],
    ['Testes', 'JUnit — parsing, formatação, tabela de taxas'],
    ['minSdk / targetSdk', '24 / 35'],
  ]

  const status = [
    { label: 'Testes unitários', value: 'passando', ok: true },
    { label: 'APK de debug', value: 'compila', ok: true },
    { label: 'Contrato de API', value: 'verificado contra o core', ok: true },
    { label: 'Testes instrumentados (UI)', value: 'não implementados', ok: false },
    { label: 'Publicação na Play Store', value: 'não iniciada', ok: false },
  ]

  return (
    <section>
      <div className="container">
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>App Android</h1>
        <p className="section-sub" style={{ textAlign: 'left', margin: '0 0 2rem' }}>
          Aplicativo nativo em Kotlin + Jetpack Compose. Consome a mesma API do site — nenhum endpoint exclusivo.
          Código aberto em <code>apps/android</code>.
        </p>

        <div className="disclaimer">
          <strong>Transparência:</strong> o app compila, os testes unitários passam e o contrato com o backend é
          verificado automaticamente. Ainda <u>não</u> há testes instrumentados de UI nem publicação em loja.
          Monetização é de testnet: NST não tem valor de mercado e não é garantia de ganho.
        </div>

        <h2 className="section-title">Capacidades</h2>
        <div className="grid">
          {capabilities.map(c => (
            <div key={c.title} className="card">
              <h3>{c.title}</h3>
              <p>{c.detail}</p>
            </div>
          ))}
        </div>

        <h2 className="section-title">Stack</h2>
        <div className="grid">
          {stack.map(([k, v]) => (
            <div key={k} className="card">
              <h3>{k}</h3>
              <p>{v}</p>
            </div>
          ))}
        </div>

        <h2 className="section-title">Estado atual</h2>
        <div className="grid">
          {status.map(s => (
            <div key={s.label} className="card">
              <h3>{s.label}</h3>
              <p>
                <span className={`status status-${s.ok ? 'done' : 'planned'}`}>
                  {s.ok ? '✓' : '○'} {s.value}
                </span>
              </p>
            </div>
          ))}
        </div>

        <h2 className="section-title">Compilar</h2>
        <div className="card" style={{ marginTop: '1rem' }}>
          <pre style={{ overflowX: 'auto', fontSize: '0.85rem' }}>{`cd apps/android
./gradlew :app:testDebugUnitTest   # testes unitarios
./gradlew :app:assembleDebug       # gera app/build/outputs/apk/debug/app-debug.apk`}</pre>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
            Requer JDK 17+ e o Android SDK (compileSdk 35).
          </p>
        </div>

        <div className="disclaimer" style={{ marginTop: '3rem' }}>
          <strong>Sem alegações falsas:</strong> o app é parte de uma testnet em construção. Não afirmamos que é
          descentralizado, seguro ou escalável sem evidência técnica mensurável.
        </div>
      </div>
    </section>
  )
}
