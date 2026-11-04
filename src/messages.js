// What each checker issue code and generator error means, in plain words, in
// English and Italian. The CLI prints the English line next to the code; the
// web page shows the line in the visitor's language.
//
// The issue lines are the ones of the AI Readiness Check
// (TryGeoSuite/geo-toolkit/check-page.js, `agentsIssue`): keep them in step.

export const ISSUE_TEXT = {
  en: {
    domain_mismatch: 'the declared domain is not the host that serves the file',
    domain_not_in_issuer: 'the sign-in server does not list this domain in protected_resources',
    invalid_agent_protocol: 'a conversation channel has no type or no https address',
    invalid_api_entry: 'an API has no type, address or description',
    invalid_auth_issuer: 'auth.issuer is not an https address',
    invalid_browser_session_endpoint: 'the browser session address is not https',
    invalid_grant_types: 'the sign-in server does not list grant_types_supported with refresh_token',
    issuer_metadata_invalid: 'the sign-in server metadata cannot be read',
    issuer_metadata_unreachable: 'the sign-in server metadata does not respond',
    issuer_mismatch: 'the sign-in server declares a different issuer',
    issuer_not_listed: 'auth.issuer is not among the authorization servers the domain declares',
    missing_auth_issuer: 'the domain declares more than one authorization server, and auth.issuer does not say which one agents use',
    missing_authorization_endpoint: 'the sign-in server offers authorization_code, but has no https authorization_endpoint',
    missing_device_authorization_endpoint: 'the sign-in server offers the device code grant, but has no https device_authorization_endpoint',
    missing_organization: 'the organization name or domain is missing',
    missing_protocol_version: 'the protocol version is missing',
    missing_revocation_endpoint: 'the sign-in server does not say where access is revoked (an https revocation_endpoint)',
    missing_token_endpoint: 'the sign-in server does not say where agents get their tokens (an https token_endpoint)',
    no_channels: 'it declares no channel (conversation, API or website)',
    not_an_object: 'the file is not a JSON object',
    not_https: 'the file goes through a non-https address',
    protected_resource_invalid: "the domain's /.well-known/oauth-protected-resource cannot be read, or names another resource",
    protected_resource_unreachable: "the domain's /.well-known/oauth-protected-resource does not respond",
    sign_in_conflict: 'sign-in is turned off (auth.disabled), but the file still offers it',
    sign_in_without_issuer: 'the file offers sign-in, but the domain names no sign-in server in /.well-known/oauth-protected-resource',
    unsupported_version: 'the protocol version is not 0.3, the draft agents follow today',
    wrong_final_path: 'the redirects end on an address other than /.well-known/poppy.json',
  },
  it: {
    domain_mismatch: 'il dominio dichiarato non è l’host che serve il file',
    domain_not_in_issuer: 'il server di login non elenca questo dominio in protected_resources',
    invalid_agent_protocol: 'un canale di conversazione è senza tipo o senza indirizzo https',
    invalid_api_entry: 'un’API è senza tipo, indirizzo o descrizione',
    invalid_auth_issuer: 'auth.issuer non è un indirizzo https',
    invalid_browser_session_endpoint: 'l’indirizzo per la sessione nel browser non è https',
    invalid_grant_types: 'il server di login non elenca grant_types_supported con refresh_token',
    issuer_metadata_invalid: 'i metadati del server di login non sono leggibili',
    issuer_metadata_unreachable: 'i metadati del server di login non rispondono',
    issuer_mismatch: 'il server di login dichiara un issuer diverso',
    issuer_not_listed: 'auth.issuer non è tra i server di autorizzazione che il dominio dichiara',
    missing_auth_issuer: 'il dominio dichiara più server di autorizzazione e auth.issuer non dice quale usano gli agenti',
    missing_authorization_endpoint: 'il server di login offre authorization_code, ma non ha un authorization_endpoint https',
    missing_device_authorization_endpoint: 'il server di login offre il device code, ma non ha un device_authorization_endpoint https',
    missing_organization: 'mancano nome o dominio dell’organizzazione',
    missing_protocol_version: 'manca la versione del protocollo',
    missing_revocation_endpoint: 'il server di login non dice dove si revoca l’accesso (manca un revocation_endpoint https)',
    missing_token_endpoint: 'il server di login non dice dove gli agenti ottengono i token (manca un token_endpoint https)',
    no_channels: 'non dichiara nessun canale (conversazione, API o sito)',
    not_an_object: 'il file non è un oggetto JSON',
    not_https: 'il file passa per un indirizzo non https',
    protected_resource_invalid: 'il /.well-known/oauth-protected-resource del dominio non si legge, o indica un’altra risorsa',
    protected_resource_unreachable: 'il /.well-known/oauth-protected-resource del dominio non risponde',
    sign_in_conflict: 'il login è spento (auth.disabled), ma il file lo offre ancora',
    sign_in_without_issuer: 'il file offre il login, ma il dominio non indica nessun server di login in /.well-known/oauth-protected-resource',
    unsupported_version: 'la versione del protocollo non è la 0.3, la bozza che gli agenti seguono oggi',
    wrong_final_path: 'i redirect finiscono su un indirizzo diverso da /.well-known/poppy.json',
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
    missing_mediated_scopes: 'Mediated sign-in needs the scopes it can grant, like orders:read.',
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
    missing_mediated_scopes: 'L’accesso mediated richiede gli scope che può concedere, per esempio orders:read.',
  },
};

// One line per issue code, in `lang` (English when the language or code is unknown).
export function explainIssue(code, lang = 'en') {
  const table = ISSUE_TEXT[lang] || ISSUE_TEXT.en;
  return table[code] || ISSUE_TEXT.en[code] || code;
}
