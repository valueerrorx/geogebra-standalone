# geogebra - linux - standalone

just the original geogebra packaged as linux appimage and debian package


# technologies used
* electron
* vite
* node.js
* vue.js
* bootstrap.css

## install necessary modules 

```npm i```

## download GeoGebra assets

**Run this once** It fetches the GeoGebra HTML5 bundle into `packages/renderer/public/geogebra/`

```npm run download```

## run geogebra

```npm run dev```

## build geogebra for linux (appimage, deb)

```npm run build```

## typical order

1. `npm i`
2. `npm run download`
3. `npm run dev` — or — `npm run build`


