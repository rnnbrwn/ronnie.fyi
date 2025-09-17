# ronnie.fyi

Personal website and blog built with Eleventy, featuring a clean responsive design and Spotify integration.

🌐 **Live Site**: [ronnie.fyi](https://ronnie.fyi)

## ✨ Features

- **Static Site Generation**: Built with [Eleventy](https://www.11ty.dev/) for fast, secure sites
- **Modern CSS**: Sass compilation with responsive design and centered layouts
- **Spotify Integration**: Live display of currently playing tracks via Spotify API
- **Automated Deployment**: GitHub Actions workflow for continuous deployment
- **Clean Typography**: Optimized reading experience with proper content max-widths
- **Mobile Responsive**: Full-width header with centered content areas

## 🛠 Technology Stack

- **Static Site Generator**: [Eleventy v0.12.1](https://www.11ty.dev/)
- **CSS Preprocessor**: [Sass](https://sass-lang.com/) with automatic compilation
- **Templating**: Nunjucks templates with layouts and includes
- **Development Server**: BrowserSync with live reload
- **Build Tools**: Node.js and npm scripts
- **Deployment**: GitHub Actions + SFTP to web host
- **Music Integration**: Spotify Web API for current track display

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 20 or higher)
- npm (comes with Node.js)
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/rnnbrwn/ronnie-fyi.git
   cd ronnie-fyi
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run serve
   ```
   
   This starts both Eleventy with live reload and Sass compilation watching for changes.
   Site will be available at `http://localhost:8081`

### Build Commands

- **Development server**: `npm run serve` - Eleventy + Sass with live reload
- **Production build**: `npm run build` - Builds site with compiled CSS
- **Watch mode**: `npm run watch` - Eleventy only, no Sass compilation
- **Start server**: `npm start` - Eleventy server only
- **Update Spotify**: `npm run update-track` - Fetches current Spotify track

## 📁 Project Structure

```
├── _data/                    # Global data files
│   ├── metadata.json        # Site metadata and configuration
│   └── currentTrack.json    # Current Spotify track data
├── _includes/               # Templates and layouts
│   └── layouts/
│       ├── base.njk         # Main HTML structure
│       ├── home.njk         # Homepage template
│       └── post.njk         # Blog post template
├── posts/                   # Blog posts (Markdown)
├── sass/                    # Sass stylesheets
│   └── index.scss          # Main stylesheet
├── scripts/                 # Build and utility scripts
├── _site/                   # Generated site (ignored by git)
├── .eleventy.js            # Eleventy configuration
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## 🎨 Design Features

### Layout System
- **Full-width header**: Spans entire viewport width with subtle background
- **Centered content**: Main content area with optimal reading width (65ch)
- **Flexible navigation**: Header accommodates growing navigation items
- **Responsive design**: Mobile-first approach with proper breakpoints

### CSS Architecture
- **Sass preprocessing**: Organized stylesheets with variables and nesting
- **Custom properties**: CSS variables for consistent theming
- **Typography**: Optimized font stacks and reading experience
- **Component-based**: Modular CSS for posts, navigation, and page elements

## 🎵 Spotify Integration

The site displays currently playing tracks using the Spotify Web API:

- **Automatic updates**: GitHub Actions updates track data hourly
- **API integration**: Secure token refresh and track fetching
- **Fallback handling**: Graceful display when no track is playing
- **Privacy respecting**: Only displays publicly available track information

### Environment Variables

For Spotify integration, set these secrets in GitHub Actions:
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`  
- `SPOTIFY_REFRESH_TOKEN`

## 🚀 Deployment

The site uses GitHub Actions for automated deployment:

1. **Trigger**: Push to `main` branch or hourly cron job
2. **Build**: Eleventy generates static site with Sass compilation
3. **Spotify**: Fetches current track and updates data
4. **Deploy**: SFTP upload to web host
5. **Commit**: Updates Spotify data back to repository

### Deployment Configuration

See `.github/workflows/build-production.yml` for the complete workflow.

## 🛠 Development Notes

### Build Process
The production build ensures CSS is properly compiled:
```bash
# Build order: Eleventy first, then Sass
eleventy && npx sass sass:_site/css
```

### Git Configuration
- `_site/` directory is gitignored (generated content)
- Spotify track data is committed automatically
- Feature branches for organized development

### Browser Support
- Modern browsers with CSS Grid and Flexbox support
- Progressive enhancement for older browsers
- Mobile-first responsive design

## 📝 Content Management

### Adding Blog Posts
1. Create new `.md` file in `posts/` directory
2. Add frontmatter with title, date, and tags
3. Write content in Markdown
4. Run development server to preview

### Updating Site Data
Edit `_data/metadata.json` for:
- Site title and description
- Navigation items
- Social links and metadata

## 🤝 Contributing

This is a personal website, but if you notice any issues or have suggestions:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- **Live Site**: [ronnie.fyi](https://ronnie.fyi)
- **Repository**: [github.com/rnnbrwn/ronnie-fyi](https://github.com/rnnbrwn/ronnie-fyi)
- **Eleventy**: [11ty.dev](https://www.11ty.dev/)
- **Contact**: [Bluesky @ronnie.fyi](https://bsky.app/profile/ronnie.fyi)
