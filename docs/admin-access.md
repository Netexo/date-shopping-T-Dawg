# Admin-Zugriff über GitHub

Die eigene Passwortanmeldung wurde entfernt. Nur das in
`ADMIN_GITHUB_USER_ID` freigegebene GitHub-Konto kann eine Admin-Sitzung erhalten.
Die normale Website bleibt öffentlich. Vercel Deployment Protection muss dafür
nicht eingeschaltet werden, da es das gesamte Deployment schützt.

## Einmalige Einrichtung

1. In GitHub unter Settings → Developer settings → OAuth Apps eine OAuth App
   registrieren. Homepage URL ist die feste HTTPS-Adresse der Website.
2. Authorization callback URL exakt auf
   `https://DEINE-DOMAIN/api/admin/callback` setzen.
3. In Vercel im Projekt `t-dawg` unter Settings → Environment Variables setzen:
   - `ADMIN_AUTH_ORIGIN`: die feste HTTPS-Adresse, ohne abschließenden Slash.
   - `ADMIN_GITHUB_CLIENT_ID`: Client ID der GitHub OAuth App.
   - `ADMIN_GITHUB_CLIENT_SECRET`: deren Client Secret, nur serverseitig.
   - `ADMIN_GITHUB_USER_ID`: numerische ID deines GitHub-Kontos, nicht Benutzername.
     Die ID ist über `https://api.github.com/users/DEIN-BENUTZERNAME` im Feld `id`
     abrufbar. Ausschließlich die ID des vorgesehenen Administrators eintragen.
   - `ADMIN_SESSION_SECRET`: unabhängig generierter Zufallswert mit mindestens
     32 Zeichen; nur serverseitig. Nicht das GitHub-Secret wiederverwenden.
4. Variablen für Production setzen. Für lokale Tests eine separate OAuth App
   mit `http://localhost:3000/api/admin/callback` und passende `.env.local`
   verwenden. Preview-Deployments ohne Konfiguration bleiben gesperrt. Die
   konfigurierte feste Adresse verhindert wechselnde Callback-Hosts.
5. Änderungen gelten nach einem späteren manuellen Deployment. Es erfolgt kein
   automatisches Deployment durch diese Implementierung.

`ADMIN_PASSWORD` und `ADMIN_COOKIE_SECURE` werden nicht mehr verwendet. Die
OAuth-Konfiguration setzt sichere Cookies bei HTTPS automatisch. Der vorhandene
`BLOB_READ_WRITE_TOKEN` bleibt unverändert.

## Schutz

`/admin` verlangt eine signierte, ablaufende HttpOnly-Sitzung. Ohne Sitzung führt
es zur Anmeldung über GitHub. Wer bei GitHub bereits angemeldet ist, muss kein
zusätzliches Website-Passwort eingeben. Eine einmalige Zustimmung bei GitHub kann
nötig sein. `/admin/login` enthält ausschließlich einen SSO-Link, kein Passwortformular.

Die Start- und Callback-Routen liegen unter `/api/admin/authorize` und
`/api/admin/callback`. Sie verwenden PKCE und kurzlebigen, signierten State.
Zugriffstokens werden ausschließlich serverseitig für die Identitätsprüfung
verwendet und nicht gespeichert oder an den Browser ausgegeben. Die feste
GitHub-ID wird vor dem Ausstellen einer lokalen Sitzung geprüft. Ein anderes
GitHub-Konto erhält keinen Zugriff. Alte Passwort-Sitzungen werden nicht akzeptiert.

Alle GET-Abfragen für Bestellungen und Freundesbücher verlangen dieselbe
serverseitig geprüfte Sitzung. Die öffentlichen POST-Routen zum Erstellen der
Einträge bleiben für den Date-Ablauf erhalten. Der alte Passwort-POST-Endpunkt
antwortet mit 410 und kann keine Sitzung mehr erzeugen.

Ohne vollständige Konfiguration oder bei Providerfehlern bleibt der Zugriff
verweigert. Abmelden entfernt die lokale Sitzung; die Anmeldung bei GitHub selbst
wird dadurch nicht beendet.
