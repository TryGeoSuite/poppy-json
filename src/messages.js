// What each checker issue code and generator error means, in plain words, in
// English and Italian. The CLI prints the English line next to the code; the
// web page shows the line in the visitor's language.
//
// The issue lines are the ones of the AI Readiness Check
// (TryGeoSuite/geo-toolkit/check-page.js, `agentsIssue`): keep them in step.

export const ISSUE_TEXT = {
  en: {
    domain_mismatch: 'the declared domain is not the site’s',
    domain_not_in_issuer: 'the sign-in server does not list this domain in poppy_domains',
    invalid_agent_protocol: 'a conversation channel has no type or no https address',
    invalid_api_entry: 'an API has no type, address or description',
    invalid_browser_session_endpoint: 'the browser session address is not https',
    issuer_metadata_invalid: 'the sign-in server metadata cannot be read',
    issuer_metadata_unreachable: 'the sign-in server metadata does not respond',
    issuer_mismatch: 'the sign-in server declares a different issuer',
    missing_auth_issuer: 'the sign-in server (auth.issuer) is missing',
    missing_organization: 'the organization name or domain is missing',
    missing_protocol_version: 'the protocol version is missing',
    no_channels: 'it declares no channel (conversation, API or website)',
    not_an_object: 'the file is not a JSON object',
    not_https: 'the file goes through a non-https address',
    unsupported_major_version: 'the protocol version is not supported',
  },
  it: {
    domain_mismatch: 'il dominio dichiarato non è quello del sito',
    domain_not_in_issuer: 'il server di login non elenca questo dominio in poppy_domains',
    invalid_agent_protocol: 'un canale di conversazione è senza tipo o senza indirizzo https',
    invalid_api_entry: 'un’API è senza tipo, indirizzo o descrizione',
    invalid_browser_session_endpoint: 'l’indirizzo per la sessione nel browser non è https',
    issuer_metadata_invalid: 'i metadati del server di login non sono leggibili',
    issuer_metadata_unreachable: 'i metadati del server di login non rispondono',
    issuer_mismatch: 'il server di login dichiara un issuer diverso',
    missing_auth_issuer: 'manca il server di login (auth.issuer)',
    missing_organization: 'mancano nome o dominio dell’organizzazione',
    missing_protocol_version: 'manca la versione del protocollo',
    no_channels: 'non dichiara nessun canale (conversazione, API o sito)',
    not_an_object: 'il file non è un oggetto JSON',
    not_https: 'il file passa per un indirizzo non https',
    unsupported_major_version: 'la versione del protocollo non è supportata',
  },
};

// Errors thrown by generatePoppy (error.code), for the form and the CLI.
export const INPUT_ERROR_TEXT = {
  en: {
    missing_name: 'Enter the organization name.',
    missing_domain: 'Enter the domain the file is published on, like acme.com.',
    invalid_domain: 'The domain does not look right: write only the host, like acme.com.',
    invalid_issuer: 'The sign-in server (OAuth issuer) must be an https address, like https://auth.acme.com.',
    invalid_url: 'Every address must start with https://.',
    no_channels: 'Add at least one channel: a conversation endpoint, an MCP server, an OpenAPI description or a browser session endpoint.',
    no_sign_in: 'Pick at least one sign-in type.',
    unknown_sign_in: 'Sign-in types are direct, device and mediated.',
    unknown_api_type: 'API types are mcp and openapi.',
    missing_mediated_endpoint: 'Mediated sign-in needs the https address of your sign-in endpoint.',
  },
  it: {
    missing_name: 'Scrivi il nome dell’organizzazione.',
    missing_domain: 'Scrivi il dominio su cui pubblichi il file, per esempio acme.it.',
    invalid_domain: 'Il dominio non sembra giusto: scrivi solo l’host, per esempio acme.it.',
    invalid_issuer: 'Il server di login (issuer OAuth) deve essere un indirizzo https, per esempio https://auth.acme.it.',
    invalid_url: 'Ogni indirizzo deve iniziare con https://.',
    no_channels: 'Aggiungi almeno un canale: un endpoint di conversazione, un server MCP, una descrizione OpenAPI o un endpoint per la sessione nel browser.',
    no_sign_in: 'Scegli almeno un tipo di accesso.',
    unknown_sign_in: 'I tipi di accesso sono direct, device e mediated.',
    unknown_api_type: 'I tipi di API sono mcp e openapi.',
    missing_mediated_endpoint: 'L’accesso mediated richiede l’indirizzo https del tuo endpoint di login.',
  },
};

// One line per issue code, in `lang` (English when the language or code is unknown).
export function explainIssue(code, lang = 'en') {
  const table = ISSUE_TEXT[lang] || ISSUE_TEXT.en;
  return table[code] || ISSUE_TEXT.en[code] || code;
}
