const token =
  "EAANhZClS6ZCeYBSdcHOC6Ne9TD5m1o7h8QG6s8ZC65ZBdRmp4ruWdX2kOV2uTbmSRwimo2uyefGD4SnJzeZCn1WEmEIspoB7ZAmYvOUh9JV5QB9o3a27ufF5yRsvCX5gRZAmruk6GaozfqixmvUfFmDBdaCZC7hZCsZBfJ6MCCXX1ezY5ESNPviJTOZCtVEOOZATlQZDZD";
const phoneNumberId = "1289119034283809";

async function test() {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
