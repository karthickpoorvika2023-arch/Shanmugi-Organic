# Shanmuga Organics — எந்த folder-ஐப் பயன்படுத்துவது?

`frontend/` மற்றும் `dist/` ஆகிய இரண்டிலும் ஒரே HTML பக்கங்கள் இருப்பது **சரியானது**. இவை பழைய / புதிய இரண்டு தனித்தனி website-கள் அல்ல.

| Folder | எதற்காக? |
| --- | --- |
| `frontend/` | **மூலப் பக்கங்கள்**. HTML, CSS, JavaScript மாற்றங்களை இங்கே செய்யுங்கள். |
| `plugins/` | Website பயன்படுத்தும் கூடுதல் JavaScript / CSS மூலக் கோப்புகள். |
| `dist/` | **வெளியிட வேண்டிய கோப்புகள்**. Build செய்யும்போது `frontend/`, `plugins/` ஆகியவற்றிலிருந்து புதிதாக உருவாகும்; நேரடியாக இங்கே மாற்ற வேண்டாம். |

## எப்படி இயக்குவது?

Project-ன் முதல் folder-ல் terminal திறந்து:

```text
npm install
npm run dev
```

பிறகு browser-ல் `http://localhost:4173/` திறக்கவும். இந்த local preview `frontend/` மற்றும் `plugins/` கோப்புகளைப் பயன்படுத்துகிறது; `dist/`-ஐ அல்ல.

**Admin login:** `http://localhost:4173/admin.html` திறக்கவும். VS Code **Live Server**-ல் பார்க்க விரும்பினால், VS Code-ல் `Version_1` முழு project folder-ஐத் திறந்து, `frontend/admin.html`-ல் **Open with Live Server** தேர்ந்தெடுக்கவும். `frontend/` folder-ஐ மட்டும் workspace-ஆகத் திறக்காதீர்கள்; `plugins/` அதற்கு வெளியே இருக்கிறது. Live Server-ல் வரும் முகவரி `/frontend/admin.html` என்று இருக்க வேண்டும். `file://` வழியாக HTML-ஐ நேரடியாகத் திறக்க வேண்டாம். Admin email/password-ஐ code-ல் எழுத வேண்டாம்.

## Website-ஐ வெளியிடுவது

```text
npm test
npm run build
```

Build முடிந்ததும் `dist/` **folder-ன் உள்ளே உள்ள எல்லாக் கோப்புகளையும்**, அதன் `assets/`, `plugins/` subfolders உட்பட, static hosting-ல் வெளியிடுங்கள். Hosting அமைப்பில் publish directory கேட்கப்பட்டால் `dist` என்று கொடுங்கள். உங்கள் hosting இப்போது எந்த folder-ஐப் பயன்படுத்துகிறது என்பது அதன் dashboard/settings பார்க்காமல் உறுதியாகச் சொல்ல முடியாது.

**முக்கியம்:** `npm run build` ஒவ்வொரு முறையும் ஏற்கெனவே உள்ள `dist/`-ஐ அழித்து மீண்டும் உருவாக்கும். எனவே `dist/`-ல் நேரடியாக மாற்றங்கள் செய்யாதீர்கள். `frontend/` அல்லது `dist/`-ஐ `old/`-க்கு நகர்த்தாதீர்கள்; இரண்டும் தேவையானவை. பழைய, பயன்படுத்தப்படாத HTML பக்கங்கள் இருப்பது கண்டறியப்படவில்லை.

மேலும் project விவரங்களுக்கு [`md/README.md`](md/README.md) பார்க்கவும்.