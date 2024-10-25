const spinnerContainer = document.getElementById("spinner-container");
const resultsContainer = document.getElementById("results");
const downloadButton = document.getElementById("download-btn");
let validAccounts = [];

// Variables pour le suivi
let totalAccountsTested = 0; // Compte total des comptes testés
let totalValidAccounts = 0;   // Compte total des comptes valides

// Proxy CORS
const corsProxy = "https://cors-anywhere.herokuapp.com/";

// Fonction pour afficher le spinner
function showSpinner() {
    spinnerContainer.style.display = "flex";
}

// Fonction pour masquer le spinner
function hideSpinner() {
    spinnerContainer.style.display = "none";
}

// Fonction pour tester les connexions
async function testerConnections(panel, mac, user, password, m3u) {
    let valide = false;

    // Prioriser la connexion Xtream
    if (user && password && panel) {
        console.log(`Test de la connexion Xtream (User/Pass) : ${user}/${password}`);
        valide = await testerXtream(panel, user, password);
    } 
    // Ensuite tester la connexion MAC
    else if (mac && panel) {
        console.log(`Test de la connexion MAC : ${mac}`);
        valide = await testerMac(panel, mac);
    } 
    // Tester le lien M3U en dernier recours
    else if (m3u) {
        console.log(`Test du lien M3U : ${m3u}`);
        valide = await testerM3U(m3u);
    }

    return valide;
}

// Fonction pour tester une connexion Xtream
async function testerXtream(panel, user, password) {
    const xtreamUrl = `${corsProxy}${panel}/player_api.php?username=${user}&password=${password}`;

    try {
        const response = await fetch(xtreamUrl);
        if (response.ok) {
            const data = await response.json();
            if (data.user_info && data.user_info.auth) {
                return true; // Connexion réussie
            }
        }
    } catch (error) {
        console.error('Erreur lors du test Xtream:', error);
    }
    return false; // Connexion échouée
}

// Fonction pour tester une connexion MAC
async function testerMac(panel, mac) {
    const macUrl = `${corsProxy}${panel}/player_api.php?mac=${mac}`;

    try {
        const response = await fetch(macUrl);
        if (response.ok) {
            const data = await response.json();
            if (data.user_info && data.user_info.auth) {
                return true; // Connexion réussie
            }
        }
    } catch (error) {
        console.error('Erreur lors du test MAC:', error);
    }
    return false; // Connexion échouée
}

// Fonction pour tester une connexion M3U
async function testerM3U(m3u) {
    const m3uUrl = `${corsProxy}${m3u}`;
    
    try {
        const response = await fetch(m3uUrl);
        if (response.ok) {
            return true; // Connexion réussie
        }
    } catch (error) {
        console.error('Erreur lors du test M3U:', error);
    }
    return false; // Connexion échouée
}

// Lecture du fichier et traitement des comptes
function handleFile(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = async function (e) {
        const text = e.target.result;
        const comptes = text.split("\n\n"); // Sépare les comptes par bloc

        showSpinner(); // Affiche le spinner
        resultsContainer.textContent = ""; // Réinitialise les résultats
        validAccounts = []; // Réinitialise les comptes valides
        totalAccountsTested = 0; // Réinitialise le compteur de comptes testés
        totalValidAccounts = 0;   // Réinitialise le compteur de comptes valides

        for (let i = 0; i < comptes.length; i++) {
            const lignes = comptes[i].split("\n");
            const mac = detecterMac(lignes);
            const [m3u, user, password] = detecterM3U(lignes);
            const panel = detecterPanel(lignes);

            // Tester les connexions
            const valide = await testerConnections(panel, mac, user, password, m3u);

            // Afficher les résultats
            const resultText = `Compte ${i + 1}: ${valide ? 'Connexion réussie' : 'Connexion échouée'}`;
            console.log(resultText);
            resultsContainer.textContent += resultText + "\n";

            // Enregistrer les comptes valides
            if (valide) {
                validAccounts.push({ panel, mac, user, password, m3u });
                totalValidAccounts++; // Incrémente le compteur des comptes valides
            }
            totalAccountsTested++; // Incrémente le compteur des comptes testés
        }

        // Affiche les totaux à la fin
        resultsContainer.textContent += `\nNombre total de comptes testés : ${totalAccountsTested}\n`;
        resultsContainer.textContent += `Nombre total de comptes valides : ${totalValidAccounts}\n`;

        hideSpinner(); // Masque le spinner
        downloadButton.style.display = validAccounts.length > 0 ? 'block' : 'none'; // Affiche le bouton de téléchargement si des comptes valides existent
    };

    reader.readAsText(file);
}

// Fonction pour détecter l'adresse MAC
function detecterMac(lignes) {
    for (const ligne of lignes) {
        const mac = ligne.match(/(00:1A:79:[0-9A-Fa-f:]{8})/);
        if (mac) {
            return mac[1];
        }
    }
    return null;
}

// Fonction pour détecter le lien M3U et extraire user/pass
function detecterM3U(lignes) {
    for (const ligne of lignes) {
        const m3u = ligne.match(/(http.*?m3u_plus)/);
        if (m3u) {
            const m3uUrl = m3u[1];
            const username = new URL(m3uUrl).searchParams.get('username');
            const password = new URL(m3uUrl).searchParams.get('password');
            return [m3uUrl, username || '', password || ''];
        }
    }
    return [null, null, null];
}

// Fonction pour détecter le panel (URL)
function detecterPanel(lignes) {
    for (const ligne of lignes) {
        const panel = ligne.match(/(http:\/\/[^/]+)/);
        if (panel) {
            return panel[1];
        }
    }
    return null;
}

// Fonction pour télécharger les comptes valides
function downloadValidAccounts() {
    const validAccountsText = validAccounts.map(account => 
        `Panel: ${account.panel}\nUser: ${account.user}\nPass: ${account.password}\nMac: ${account.mac}\nM3U: ${account.m3u}\n\n`
    ).join("");
    
    const blob = new Blob([validAccountsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "comptes_valides.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Écouteur d'événements pour le fichier
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("file-input").addEventListener("change", handleFile);
    downloadButton.addEventListener("click", downloadValidAccounts);
});

document.getElementById("example-button").addEventListener("click", function() {
    const message = `
    ✪ P ➢ http://mohdtv.com:8880/c/
    ✪ R ➢ http://mohdtv.com:8880/c/
    ✪ Usᴇʀ ➢ ALLChannels6AE2F4D37312
    ✪ Pᴀss ➢ 89827619\n
    ou contenant un M3U :\nhttp://1234up.com:8080/get.php?username=bjbyAok3y2cQMRam&password=sg0BXJK6Hf&type=m3u_plus&output=m3u8\n\nSi vous rencontrez un problème n'hésitez pas à me contacter sur discord.
    `;
    
    alert(message); // Affiche le message dans une fenêtre d'alerte
});
