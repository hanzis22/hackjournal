export interface MethodologyItem {
  id: string
  name: string
  description: string
  category: string
  reference?: string
}

export interface MethodologyTemplate {
  id: string
  name: string
  description: string
  items: MethodologyItem[]
}

export const builtInMethodologies: MethodologyTemplate[] = [
  {
    id: 'owasp-top-10-2021',
    name: 'OWASP Top 10 (2021)',
    description: 'The standard awareness document for developers and web application security.',
    items: [
      { id: 'A01', name: 'A01:2021 - Broken Access Control', description: 'Test for privilege escalation, insecure direct object references (IDOR), and CORS misconfigurations.', category: 'Web', reference: 'https://owasp.org/Top10/A01_2021-Broken_Access_Control/' },
      { id: 'A02', name: 'A02:2021 - Cryptographic Failures', description: 'Test for sensitive data exposure, weak encryption, and missing TLS.', category: 'Web', reference: 'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/' },
      { id: 'A03', name: 'A03:2021 - Injection', description: 'Test for SQLi, XSS, Command Injection, and LDAP injection.', category: 'Web', reference: 'https://owasp.org/Top10/A03_2021-Injection/' },
      { id: 'A04', name: 'A04:2021 - Insecure Design', description: 'Assess business logic flaws and lack of secure design patterns.', category: 'Web', reference: 'https://owasp.org/Top10/A04_2021-Insecure_Design/' },
      { id: 'A05', name: 'A05:2021 - Security Misconfiguration', description: 'Test for default credentials, open cloud storage, and verbose error messages.', category: 'Web', reference: 'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/' },
      { id: 'A06', name: 'A06:2021 - Vulnerable and Outdated Components', description: 'Identify outdated libraries, frameworks, or OS components.', category: 'Web', reference: 'https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/' },
      { id: 'A07', name: 'A07:2021 - Identification and Authentication Failures', description: 'Test for weak passwords, missing MFA, and session fixation.', category: 'Web', reference: 'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/' },
      { id: 'A08', name: 'A08:2021 - Software and Data Integrity Failures', description: 'Test CI/CD pipelines, untrusted deserialization, and unverified updates.', category: 'Web', reference: 'https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/' },
      { id: 'A09', name: 'A09:2021 - Security Logging and Monitoring Failures', description: 'Verify if critical events are logged and alerted.', category: 'Web', reference: 'https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/' },
      { id: 'A10', name: 'A10:2021 - Server-Side Request Forgery (SSRF)', description: 'Test if the application fetches remote resources without validating the user-supplied URL.', category: 'Web', reference: 'https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/' }
    ]
  },
  {
    id: 'ptes-network',
    name: 'PTES Network Pentest',
    description: 'Penetration Testing Execution Standard for Network Infrastructure.',
    items: [
      { id: 'ptes-01', name: 'Intelligence Gathering (Recon)', description: 'Passive and active reconnaissance (OSINT, DNS, WHOIS).', category: 'Network' },
      { id: 'ptes-02', name: 'Threat Modeling', description: 'Identify assets, threats, and potential attack vectors.', category: 'Network' },
      { id: 'ptes-03', name: 'Vulnerability Analysis', description: 'Port scanning, service enumeration, and vulnerability scanning.', category: 'Network' },
      { id: 'ptes-04', name: 'Exploitation', description: 'Attempting to exploit identified vulnerabilities.', category: 'Network' },
      { id: 'ptes-05', name: 'Post-Exploitation', description: 'Privilege escalation, lateral movement, and data exfiltration.', category: 'Network' },
      { id: 'ptes-06', name: 'Reporting', description: 'Documenting findings and creating actionable remediation advice.', category: 'Network' }
    ]
  },
  {
    id: 'bug-bounty-web',
    name: 'Bug Bounty Quick Web Checklist',
    description: 'Fast-paced methodology for modern web bug bounty hunting.',
    items: [
      { id: 'bb-01', name: 'Subdomain Enumeration', description: 'Amass, Subfinder, Assetfinder, Chaos.', category: 'Recon' },
      { id: 'bb-02', name: 'Port Scanning', description: 'Naabu, Masscan, Nmap on discovered subdomains.', category: 'Recon' },
      { id: 'bb-03', name: 'Directory Fuzzing', description: 'ffuf, feroxbuster on interesting targets.', category: 'Recon' },
      { id: 'bb-04', name: 'Parameter Discovery', description: 'Arjun, x8 to find hidden parameters.', category: 'Fuzzing' },
      { id: 'bb-05', name: 'XSS & SQLi Fuzzing', description: 'Test inputs with polyglots and payloads.', category: 'Testing' },
      { id: 'bb-06', name: 'Business Logic Testing', description: 'Test cart flows, IDOR on user profiles, race conditions.', category: 'Testing' },
      { id: 'bb-07', name: 'API Testing', description: 'Check GraphQL introspection, REST endpoints for excessive data exposure.', category: 'Testing' }
    ]
  }
]
