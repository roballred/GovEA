# OrchardCore CMS — Capability Reference

> **Source:** [OrchardCMS/OrchardCore](https://github.com/OrchardCMS/OrchardCore)
> **Version:** v2.2.1 | **Framework:** ASP.NET Core | **License:** BSD 3-Clause
> **Total Modules:** 80+ | **Total Features:** 150+

OrchardCore is an open-source, modular, multi-tenant application framework and CMS for ASP.NET Core. It is designed to be used both as a full CMS and as an application framework that hosts features as independently loadable modules.

---

## Contents

1. [Content Management](#1-content-management)
2. [Content Types & Fields](#2-content-types--fields)
3. [Media & Assets](#3-media--assets)
4. [Users & Roles](#4-users--roles)
5. [Authentication & Security](#5-authentication--security)
6. [Workflows & Automation](#6-workflows--automation)
7. [SEO & Navigation](#7-seo--navigation)
8. [Multi-Tenancy](#8-multi-tenancy)
9. [APIs & Integrations](#9-apis--integrations)
10. [Search & Indexing](#10-search--indexing)
11. [Theming & Display](#11-theming--display)
12. [Internationalization & Localization](#12-internationalization--localization)
13. [Admin & Configuration](#13-admin--configuration)
14. [Caching & Performance](#14-caching--performance)
15. [Deployment & DevOps](#15-deployment--devops)
16. [Infrastructure & Utilities](#16-infrastructure--utilities)
17. [Cloud & Distributed](#17-cloud--distributed)
18. [Communication & Notifications](#18-communication--notifications)
19. [Key Architectural Capabilities](#19-key-architectural-capabilities)

---

## 1. Content Management

### Core Content

| Capability | Module | Description |
|---|---|---|
| Content Items | `OrchardCore.Contents` | Full content item lifecycle — create, edit, publish, delete, preview with Liquid syntax support |
| Content Types Builder | `OrchardCore.ContentTypes` | Create and alter content types from the admin UI — no code required |
| Content Preview | `OrchardCore.ContentPreview` | Live preview of content items during editing |
| Admin Dashboard | `OrchardCore.AdminDashboard` | Customisable widget-based dashboard for the admin interface |

### Content Organisation & Structure

| Capability | Module | Description |
|---|---|---|
| Lists | `OrchardCore.Lists` | Preconfigured container content type for organising items in ordered collections |
| Widgets | `OrchardCore.Widgets` | Render widgets in theme zones for page composition |
| Flows | `OrchardCore.Flows` | Content part allowing freeform widget-based page editing |
| Taxonomies | `OrchardCore.Taxonomies` | Content categorisation and tagging with admin list filters |
| Alias | `OrchardCore.Alias` | Custom logical identifiers for content items |
| Autoroute | `OrchardCore.Autoroute` | Automatic, pattern-based URL generation for content items |
| Layers | `OrchardCore.Layers` | Render widgets across pages based on conditional rules |
| Title | `OrchardCore.Title` | Adds title field to content items |
| Menu | `OrchardCore.Menu` | Full menu creation and management |
| Navigation | `OrchardCore.Navigation` | Define and display menus; navigation primitives |

### Content Publication & Scheduling

| Capability | Module | Description |
|---|---|---|
| Publish Later | `OrchardCore.PublishLater` | Schedule content items for future publication |
| Archive Later | `OrchardCore.ArchiveLater` | Schedule content items for future archival |

---

## 2. Content Types & Fields

### Available Field Types

| Field | Notes |
|---|---|
| Text Field | Plain text input |
| HTML Field | Rich text with HTML editor |
| Markdown Field | Markdown input with preview |
| Boolean Field | True/false checkbox |
| Date/Time Field | Date and time picker |
| Numeric Field | Integer or decimal number input |
| Content Picker Field | Reference to other content items |
| User Picker Field | Reference to users (with SQL indexing) |
| Taxonomy Field | Taxonomy term selection |
| Media Field | Attach media files to content |
| Spatial Field | Geolocation/coordinate data |
| Link Field | URL with optional display text |

### Field Infrastructure

| Capability | Module | Description |
|---|---|---|
| Content Fields | `OrchardCore.ContentFields` | Core field type implementations |
| Content Fields SQL Indexing | `OrchardCore.ContentFields` | Database-level indexing for field-based queries |
| User Picker SQL Indexing | `OrchardCore.ContentFields` | Specialised indexing for user picker fields |

---

## 3. Media & Assets

### Core Media Management

| Capability | Module | Description |
|---|---|---|
| Media | `OrchardCore.Media` | Full media library — upload, organise, crop, resize files |
| Media Cache | `OrchardCore.Media` | Remote file store caching layer |
| Media Slugify | `OrchardCore.Media` | SEO-friendly slug generation for file and folder names |
| Secure Media | `OrchardCore.Media` | Permission-based access restrictions on media folders |

### Media Indexing

| Capability | Module | Description |
|---|---|---|
| Media Indexing | `OrchardCore.Media.Indexing` | Index media files in search providers |
| Text Media Indexing | `OrchardCore.Media.Indexing` | Index common text files (.txt, .md) |
| PDF Media Indexing | `OrchardCore.Media.Indexing.Pdf` | Extract and index content from PDF files |
| OpenXML Media Indexing | `OrchardCore.Media.Indexing.OpenXML` | Index Word, PowerPoint, and Excel documents |

### Cloud Storage Providers

| Capability | Module | Description |
|---|---|---|
| Azure Blob Storage | `OrchardCore.Media.Azure` | Store media files in Azure Blob Storage |
| Azure ImageSharp Cache | `OrchardCore.Media.Azure` | Cached image resizing stored in Azure |
| Amazon S3 Storage | `OrchardCore.Media.AmazonS3` | Store media files in Amazon S3 |
| Amazon ImageSharp Cache | `OrchardCore.Media.AmazonS3` | Cached image resizing stored in S3 |

---

## 4. Users & Roles

### User Management

| Capability | Module | Description |
|---|---|---|
| Users | `OrchardCore.Users` | Full user management — list, create, edit, delete users |
| Roles | `OrchardCore.Roles` | Role assignment and permission management |
| User Registration | `OrchardCore.Users` | External user sign-up with optional email confirmation |
| Change Email | `OrchardCore.Users` | Allow users to change their email address |
| Reset Password | `OrchardCore.Users` | Password reset via email |
| User Time Zone | `OrchardCore.Users` | Per-user timezone preference |
| User Localization | `OrchardCore.Users` | Per-user culture and language selection |
| Custom User Settings | `OrchardCore.Users` | Attach custom content type fields to user profiles |
| Users Audit Trail | `OrchardCore.Users` | Event logging for user account changes |
| Authentication Ticket Store | `OrchardCore.Users` | Server-side session storage (memory or distributed) |

---

## 5. Authentication & Security

### Core Security

| Capability | Module | Description |
|---|---|---|
| Security Headers | `OrchardCore.Security` | HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) |
| HTTPS Enforcement | `OrchardCore.Https` | Force HTTPS across the site |
| CORS Configuration | `OrchardCore.Cors` | Configurable Cross-Origin Resource Sharing policies |
| ReCaptcha | `OrchardCore.ReCaptcha` | Google reCAPTCHA bot protection for forms |
| ReCaptcha for Users | `OrchardCore.ReCaptcha` | Bot protection on login, registration, and password reset |
| Audit Trail | `OrchardCore.AuditTrail` | Comprehensive event logging for compliance and security monitoring |

### Two-Factor Authentication

| Capability | Module | Description |
|---|---|---|
| 2FA Services | `OrchardCore.Users` | Core two-factor authentication infrastructure |
| Authenticator App (TOTP) | `OrchardCore.Users` | Time-based one-time password via authenticator app |
| Email 2FA | `OrchardCore.Users` | Two-factor authentication via email code |
| SMS 2FA | `OrchardCore.Users` | Two-factor authentication via SMS code |

### OpenID Connect

| Capability | Module | Description |
|---|---|---|
| OpenID Core Services | `OrchardCore.OpenId` | OpenID Connect infrastructure |
| OIDC Client | `OrchardCore.OpenId` | Use OrchardCore as an OAuth/OIDC client |
| OIDC Management UI | `OrchardCore.OpenId` | Admin UI for OpenID Connect configuration |
| OIDC Authorization Server | `OrchardCore.OpenId` | Run OrchardCore as an OAuth 2.0 / OIDC authorization server |
| Token Validation | `OrchardCore.OpenId` | Validate JWT tokens from external providers |

### External Authentication Providers

| Provider | Module | Features |
|---|---|---|
| Microsoft Account | `OrchardCore.Microsoft.Authentication` | Sign in with Microsoft personal accounts |
| Microsoft Entra ID | `OrchardCore.Microsoft.Authentication` | Azure Active Directory / Entra ID authentication |
| Google | `OrchardCore.Google` | Google sign-in, Google Analytics, Google Tag Manager |
| Meta / Facebook | `OrchardCore.Facebook` | Facebook Login, Social Plugins, Meta Pixel |
| X (Twitter) | `OrchardCore.Twitter` | Sign in with X (Twitter); X integration |
| GitHub | `OrchardCore.GitHub` | GitHub OAuth authentication |

### Data Protection

| Capability | Module | Description |
|---|---|---|
| Azure Data Protection | `OrchardCore.DataProtection.Azure` | Store ASP.NET Core Data Protection keys in Azure Blob Storage |
| Redis Data Protection | `OrchardCore.Redis` | Distribute Data Protection keys via Redis |

---

## 6. Workflows & Automation

### Workflow Engine

| Capability | Module | Description |
|---|---|---|
| Workflows | `OrchardCore.Workflows` | Visual workflow builder with activities, branches, forks, and joins |
| HTTP Workflow Activities | `OrchardCore.Workflows` | HTTP request/response activities and webhook support |
| Timer Workflow Activities | `OrchardCore.Workflows` | Schedule workflows to run on time-based triggers |
| Session Workflow Activities | `OrchardCore.Workflows` | YesSql database session-related activities |
| Forms Workflow Activities | `OrchardCore.Forms` | Trigger workflows from form submissions |

### Rules & Conditions

| Capability | Module | Description |
|---|---|---|
| Rules | `OrchardCore.Rules` | Build conditional logic for Layer display rules and workflow branching |

### Background Tasks

| Capability | Module | Description |
|---|---|---|
| Background Tasks | `OrchardCore.BackgroundTasks` | Register, manage, and monitor background jobs |
| Elasticsearch Worker | `OrchardCore.Search.Elasticsearch` | Background task to keep Elasticsearch indices in sync |
| Lucene Worker | `OrchardCore.Search.Lucene` | Background task to keep Lucene indices in sync |
| Sitemaps Cleanup | `OrchardCore.Sitemaps` | Background cleanup of sitemap cache files |

---

## 7. SEO & Navigation

### SEO

| Capability | Module | Description |
|---|---|---|
| SEO Meta Tags | `OrchardCore.Seo` | Per-content meta tags, canonical URLs, Open Graph, Twitter Cards |
| robots.txt | `OrchardCore.Seo` | Configurable robots.txt via admin UI |
| JSON-LD Structured Data | `OrchardCore.Seo` | Embed structured data for rich search results |
| Sitemaps | `OrchardCore.Sitemaps` | Automatic XML sitemap generation |
| Sitemaps for Razor Pages | `OrchardCore.Sitemaps` | Sitemap support for decoupled Razor Pages |
| Localised Content Sitemaps | `OrchardCore.Sitemaps` | Multilingual sitemap entries with hreflang |
| Feeds | `OrchardCore.Feeds` | RSS and Atom feed generation for content |

### Navigation & URLs

| Capability | Module | Description |
|---|---|---|
| Autoroute | `OrchardCore.Autoroute` | Pattern-based automatic URL generation for content |
| Alias | `OrchardCore.Alias` | Custom URL aliases for individual content items |
| Home Route | `OrchardCore.HomeRoute` | Configure which content item serves as the homepage |
| URL Rewriting | `OrchardCore.UrlRewriting` | Server-side request URL rewriting rules |
| Reverse Proxy Config | `OrchardCore.ReverseProxy` | Forwarded headers configuration for proxy scenarios |
| Admin Menu | `OrchardCore.AdminMenu` | Create custom admin-area menu items |

---

## 8. Multi-Tenancy

| Capability | Module | Description |
|---|---|---|
| Tenants | `OrchardCore.Tenants` | Create and manage multiple isolated tenants from a single instance |
| Static File Provider | `OrchardCore.Tenants` | Independent static file serving per tenant |
| Distributed Tenants | `OrchardCore.Tenants` | Synchronise tenant state across multiple server instances |
| Tenant Feature Profiles | `OrchardCore.Tenants` | Define which features are available per tenant |
| Auto Setup | `OrchardCore.AutoSetup` | Automate tenant installation via configuration |

---

## 9. APIs & Integrations

### GraphQL API

| Capability | Module | Description |
|---|---|---|
| GraphQL | `OrchardCore.Apis.GraphQL` | Full GraphQL API — query content items, content types, and custom types |

### Query System

| Capability | Module | Description |
|---|---|---|
| Queries Core Services | `OrchardCore.Queries` | Query building, execution, and management infrastructure |
| Queries Admin UI | `OrchardCore.Queries` | Create and run named queries from the admin interface |
| SQL Queries | `OrchardCore.Queries` | Custom SQL query support with parameter binding |

### Remote Publishing Protocols

| Capability | Module | Description |
|---|---|---|
| XML-RPC | `OrchardCore.XmlRpc` | XML-RPC protocol support for external client publishing |
| Remote Publishing | `OrchardCore.XmlRpc` | Publish content from desktop clients (e.g. Open Live Writer) |

---

## 10. Search & Indexing

### Search Providers

| Capability | Module | Description |
|---|---|---|
| Lucene | `OrchardCore.Search.Lucene` | Local, embedded Lucene full-text search — no external dependency |
| Lucene Content Picker | `OrchardCore.Search.Lucene` | Content picker field backed by a Lucene index |
| Elasticsearch | `OrchardCore.Search.Elasticsearch` | Distributed full-text search via Elasticsearch or OpenSearch |
| Elasticsearch Content Picker | `OrchardCore.Search.Elasticsearch` | Content picker field backed by Elasticsearch |
| Azure AI Search | `OrchardCore.Search.AzureAI` | Azure AI Search (formerly Azure Cognitive Search) integration |

### Search Infrastructure

| Capability | Module | Description |
|---|---|---|
| Indexing Core | `OrchardCore.Indexing` | Core indexing services and pipeline |
| Search Frontend | `OrchardCore.Search` | Frontend search page and results display |
| Media Indexing | `OrchardCore.Media.Indexing` | Index media file content in search providers |
| Text File Indexing | `OrchardCore.Media.Indexing` | Index .txt and .md file content |
| PDF Indexing | `OrchardCore.Media.Indexing.Pdf` | Extract and index PDF content |
| Office Document Indexing | `OrchardCore.Media.Indexing.OpenXML` | Index Word, Excel, and PowerPoint content |

---

## 11. Theming & Display

### Theme System

| Capability | Module | Description |
|---|---|---|
| Themes | `OrchardCore.Themes` | Front-end and admin theme management and switching |
| Resources | `OrchardCore.Resources` | Centralised script and stylesheet declaration with bundling |
| Placements | `OrchardCore.Placements` | Configure shape rendering positions from the admin UI |
| Placements File Storage | `OrchardCore.Placements` | Persist placement configuration to local files |

### Template & Rendering Engines

| Capability | Module | Description |
|---|---|---|
| Liquid | `OrchardCore.Liquid` | Liquid template syntax for content rendering and customisation |
| HTML Field | `OrchardCore.Html` | Rich HTML content field with configurable editor |
| Markdown | `OrchardCore.Markdown` | Markdown content field with HTML rendering |
| Shortcodes | `OrchardCore.Shortcodes` | Shortcode processing in content |
| Shortcode Templates | `OrchardCore.Shortcodes` | Create custom shortcodes from the admin UI |

---

## 12. Internationalization & Localization

### Content Localization

| Capability | Module | Description |
|---|---|---|
| Content Localization | `OrchardCore.ContentLocalization` | Translate content items into multiple cultures |
| Content Culture Picker | `OrchardCore.ContentLocalization` | Frontend widget for switching between localised content |
| Localised Sitemaps | `OrchardCore.Sitemaps` | Multilingual sitemap entries with hreflang attributes |
| Data Localization | `OrchardCore.DataLocalization` | Localise stored data values in the database |

### UI Localization

| Capability | Module | Description |
|---|---|---|
| Localization | `OrchardCore.Localization` | UI strings localisation for admin and front-end |
| Content-Language Header | `OrchardCore.Localization` | Set HTTP Content-Language response headers |
| Admin Culture Picker | `OrchardCore.Localization` | Switch the admin interface language |
| User Localization | `OrchardCore.Users` | Per-user language and culture preference |

---

## 13. Admin & Configuration

### Admin Interface

| Capability | Module | Description |
|---|---|---|
| Admin | `OrchardCore.Admin` | Core admin area, navigation, and layout |
| Admin Dashboard | `OrchardCore.AdminDashboard` | Customisable widget-based admin dashboard |
| Admin Menu | `OrchardCore.AdminMenu` | Add custom items to the admin navigation |
| Features | `OrchardCore.Features` | Enable, disable, and manage modules and features |
| Settings | `OrchardCore.Settings` | Site-wide settings system |
| Custom Settings | `OrchardCore.CustomSettings` | Define content types as site-wide settings sections |

### Forms

| Capability | Module | Description |
|---|---|---|
| Forms | `OrchardCore.Forms` | Form builder widgets with validation and workflow integration |
| ReCaptcha Forms | `OrchardCore.ReCaptcha` | Bot protection on forms |

---

## 14. Caching & Performance

### Application Caching

| Capability | Module | Description |
|---|---|---|
| Dynamic Cache | `OrchardCore.DynamicCache` | Cache rendered shapes with tag-based invalidation |
| Media Cache | `OrchardCore.Media` | Cache resized/transformed media from remote stores |
| Response Compression | `OrchardCore.ResponseCompression` | Gzip/Brotli response compression middleware |
| Mini Profiler | `OrchardCore.MiniProfiler` | In-browser performance profiling widget for developers |

### Distributed Caching (Redis)

| Capability | Module | Description |
|---|---|---|
| Redis Distributed Cache | `OrchardCore.Redis` | Distributed cache using Redis for multi-instance deployments |
| Redis Bus | `OrchardCore.Redis` | Distributed message bus for cache invalidation signals |
| Redis Lock | `OrchardCore.Redis` | Distributed locking to coordinate multi-instance operations |

---

## 15. Deployment & DevOps

### Deployment System

| Capability | Module | Description |
|---|---|---|
| Deployment | `OrchardCore.Deployment` | Export and import site configuration as recipes |
| Remote Deployment | `OrchardCore.Deployment.Remote` | Push deployment packages to remote OrchardCore instances |
| Export Content to Deployment | `OrchardCore.Deployment` | Include content items in deployment exports |
| Add Content to Deployment Plan | `OrchardCore.Deployment` | Add individual content items to a deployment plan |
| View/Download Content as JSON | `OrchardCore.Deployment` | Export content as JSON from the content list |

### Recipes

| Capability | Module | Description |
|---|---|---|
| Recipes Core Services | `OrchardCore.Recipes` | Recipe execution infrastructure |
| Recipes | `OrchardCore.Recipes` | JSON-based configuration and data import system |

### Setup & Installation

| Capability | Module | Description |
|---|---|---|
| Setup | `OrchardCore.Setup` | First-run installation wizard and database configuration |
| Auto Setup | `OrchardCore.AutoSetup` | Automated headless installation via configuration files |

---

## 16. Infrastructure & Utilities

### Middleware & Routing

| Capability | Module | Description |
|---|---|---|
| Home Route | `OrchardCore.HomeRoute` | Configure homepage routing to a content item |
| Autoroute | `OrchardCore.Autoroute` | Dynamic content-driven URL routing |
| Alias Routing | `OrchardCore.Alias` | Route requests via custom aliases |
| URL Rewriting | `OrchardCore.UrlRewriting` | Request URL rewriting rules |
| Reverse Proxy | `OrchardCore.ReverseProxy` | Forwarded header configuration for proxy environments |

### Health & Diagnostics

| Capability | Module | Description |
|---|---|---|
| Health Checks | `OrchardCore.HealthChecks` | ASP.NET Core health check endpoints for monitoring |
| Diagnostics | `OrchardCore.Diagnostics` | Error page handling and development diagnostics |
| Audit Trail | `OrchardCore.AuditTrail` | Comprehensive change event logging |
| Mini Profiler | `OrchardCore.MiniProfiler` | Developer-facing performance profiling |

### Scripting

| Capability | Module | Description |
|---|---|---|
| Scripting | `OrchardCore.Scripting` | Script execution capabilities (always enabled) |
| JavaScript Engine | `OrchardCore.Scripting` | Execute JavaScript expressions within the platform |

---

## 17. Cloud & Distributed

### Azure Services

| Capability | Module | Description |
|---|---|---|
| Azure Blob Media Storage | `OrchardCore.Media.Azure` | Store media in Azure Blob Storage |
| Azure ImageSharp Cache | `OrchardCore.Media.Azure` | Cache image transformations in Azure |
| Azure Email | `OrchardCore.Email.Azure` | Send email via Azure Communication Services |
| Azure SMS | `OrchardCore.Sms.Azure` | Send SMS via Azure Communication Services |
| Azure Data Protection | `OrchardCore.DataProtection.Azure` | Store Data Protection keys in Azure Blob Storage |
| Azure AI Search | `OrchardCore.Search.AzureAI` | Full-text search via Azure AI Search |

### Amazon Web Services

| Capability | Module | Description |
|---|---|---|
| Amazon S3 Media Storage | `OrchardCore.Media.AmazonS3` | Store media in Amazon S3 |
| Amazon ImageSharp Cache | `OrchardCore.Media.AmazonS3` | Cache image transformations in S3 |

### Redis

| Capability | Module | Description |
|---|---|---|
| Redis Distributed Cache | `OrchardCore.Redis` | Distributed application cache |
| Redis Bus | `OrchardCore.Redis` | Distributed messaging/signalling |
| Redis Lock | `OrchardCore.Redis` | Distributed locking for clustered deployments |
| Redis Data Protection | `OrchardCore.Redis` | Distribute Data Protection key ring |

---

## 18. Communication & Notifications

### Email

| Capability | Module | Description |
|---|---|---|
| Email Infrastructure | `OrchardCore.Email` | Email sending infrastructure and settings |
| SMTP Email Provider | `OrchardCore.Email.Smtp` | Send email via SMTP server |
| Azure Email Provider | `OrchardCore.Email.Azure` | Send email via Azure Communication Services |
| Email Notifications | `OrchardCore.Notifications` | Deliver user notifications via email |

### SMS

| Capability | Module | Description |
|---|---|---|
| SMS Infrastructure | `OrchardCore.Sms` | SMS sending infrastructure |
| Azure SMS Provider | `OrchardCore.Sms.Azure` | Send SMS via Azure Communication Services |
| SMS Notifications | `OrchardCore.Notifications` | Deliver user notifications via SMS |

### Notifications

| Capability | Module | Description |
|---|---|---|
| Notifications | `OrchardCore.Notifications` | In-platform user notification system |
| Email Notifications | `OrchardCore.Notifications` | Email delivery channel for notifications |
| SMS Notifications | `OrchardCore.Notifications` | SMS delivery channel for notifications |

---

## 19. Key Architectural Capabilities

| Capability | Description |
|---|---|
| **Modular Architecture** | Load only the modules and features you need — unused features have no runtime cost |
| **Multi-Tenancy** | Run multiple isolated sites from a single deployment with independent databases, media, and configuration |
| **No-Code Content Modelling** | Create and modify content types, fields, and settings entirely from the admin UI |
| **Extensibility via Code** | Custom modules, content parts, fields, workflows, and themes via standard ASP.NET Core patterns |
| **Distributed Deployment** | Redis-based distributed cache, bus, and locking support multi-instance/cluster deployments |
| **Cloud-Ready Storage** | Pluggable storage providers for Azure Blob, Amazon S3, and local file system |
| **Enterprise Security** | 2FA, OpenID Connect server, HTTPS enforcement, security headers, audit trail, role-based permissions |
| **SEO-Optimised** | Automatic sitemaps, configurable meta tags, Open Graph, JSON-LD, robots.txt, clean URLs |
| **API-First** | GraphQL API, REST queries, XML-RPC protocol for headless and decoupled use cases |
| **Performance-Optimised** | Dynamic shape caching, media transformation caching, response compression, Redis distributed cache |
| **Recipe-Based Configuration** | All configuration exportable and importable as JSON recipes for CI/CD and environment promotion |
| **Multiple Search Backends** | Choice of Lucene (embedded), Elasticsearch/OpenSearch, or Azure AI Search |
| **Workflow Automation** | Visual workflow builder with HTTP, timer, content, form, and custom activity support |
| **Localisation & i18n** | Full UI and content localisation, per-user language preferences, multilingual sitemaps |

---


## Resources

- **GitHub:** https://github.com/OrchardCMS/OrchardCore
- **Documentation:** https://docs.orchardcore.net
- **NuGet Packages:** https://www.nuget.org/profiles/OrchardCMS
- **Community:** https://github.com/OrchardCMS/OrchardCore/discussions
