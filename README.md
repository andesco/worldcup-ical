# World Cup 2026 Custom Calendar

Create a personal calendar subscription for the 2026 FIFA World Cup.

Open the calendar builder:

**https://worldcup.andrewe.ca**

It can:

- Follow your favourite teams.
- Add **big** matches between top-ranked teams.
- Add **competitive** matches using market odds.
- Update matches automatically as the tournament progresses.

## Subscribe

1. Choose your language.
2. Select your favourite teams.
3. Enable any additional match rules you want.
4. Review the example matches in the feed.
5. Select **Subscribe** to open the feed in your calendar app, or select
   **Copy URL** and add it as a subscribed calendar manually.

Use a subscribed calendar rather than importing the `.ics` file once. A
subscription lets your calendar receive updated teams, kickoff times, and final
scores.

## Match Rules

A match is included when it satisfies at least one enabled rule:

- **Favourite teams:** includes matches involving any selected team.
- **Big games:** includes matches where both teams rank within the selected
  tournament-winner odds threshold.
- **Knockout games:** includes all 32 knockout-stage matches, including matches
  whose teams are not known yet.
- **Host openers:** includes the first home match for Canada, Mexico, and the
  United States.
- **Competitive games:** includes matches where the teams' win probabilities
  are within the selected number of percentage points.

The event description explains why each match was included. When match odds are
available, it also lists each team's win probability and the draw probability.

## Calendar Options

- Show or hide team flag emoji.
- Display full team names or FIFA three-letter codes.
- Use English, Spanish, French, Portuguese, German, Dutch, or Norwegian Bokmål.

Your choices are encoded directly in the subscription URL. You can reopen that
same URL in a browser later to review or change the calendar settings. Calendar
apps receive the calendar feed from it, while browsers receive the settings and
preview page.

## Knockout Placeholders

Some knockout matches are scheduled before their participants are known. The
calendar uses bracket-slot codes until results determine the teams:

- `A1`: winner of Group A
- `C2`: runner-up of Group C
- `X3`: one of the qualifying third-place teams

`X3` is intentionally generic because the specific third-place team assigned to
that match depends on the final combination of qualifying groups. These
placeholders are replaced with team names automatically as the bracket becomes
known.

Later knockout rounds may display only the round name until both participants
are decided.

## Data Sources

- [`football-data.org`](https://www.football-data.org) supplies the official match
  schedule, teams, match status, and final scores.
- [`the-odds-api.com`](https://the-odds-api.com) supplies match-winner odds used to
  estimate team and draw probabilities for competitive-game selection.
- The big-game ranking uses a dated pre-tournament snapshot of tournament-winner
  odds.

Match data and odds can arrive at different times. A competitive match may not
appear until odds are available, and calendar clients decide how frequently
they refresh subscriptions.
