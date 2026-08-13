async function testHSP() {
  const cidade = "Montes Claros";
  const estado = "MG";
  try {
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cidade)},${encodeURIComponent(estado)},Brazil&format=json&limit=1`;
      console.log("Fetching geo:", geocodeUrl);
      const geoRes = await fetch(geocodeUrl, { headers: { "User-Agent": "EnergivIA-Bot" } });
      const geoData = await geoRes.json();
      console.log("Geo data:", geoData);
      
      if (!geoData || geoData.length === 0) return { error: "Localização não encontrada." };
      
      const { lat, lon } = geoData[0];
      const nasaUrl = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`;
      console.log("Fetching NASA:", nasaUrl);
      const nasaRes = await fetch(nasaUrl);
      const nasaData = await nasaRes.json();
      
      console.log("NASA data properties:", nasaData?.properties?.parameter?.ALLSKY_SFC_SW_DWN);
      const hspAnual = nasaData?.properties?.parameter?.ALLSKY_SFC_SW_DWN?.ANN;
      console.log("HSP Anual:", hspAnual);
  } catch(e) {
      console.error(e);
  }
}
testHSP();
