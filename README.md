# mech_nKeys_demo
This is the demo version of the mech_nKeys website.
=======
### INSTRUCTIONS FOR DEMO
 cp after_mech/.env.example after_mech/.env
./scripts/dev.sh
# open http://127.0.0.1:8000

### WHAT THE SCRIPT DOES:
1. Creates venv + activates it.
2. Install requirements.txt
3. Setup env
4. Migrate + Seed
5. Start ASGI ( Daphne )
