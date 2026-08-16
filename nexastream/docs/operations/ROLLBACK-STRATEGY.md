# Rollback Strategy (rule 56, 109)

## API: re-deploy tag anterior (< 5 min)
## Blockchain: replay do genesis com versão anterior, estado em disco
## Contratos: deploy anterior + migration de estado
## Database: migration reversa (down) documentada, backup antes

## Procedimento testado:
1. Identificar versão estável anterior
2. Re-deploy da versão anterior
3. Restaurar estado do backup
4. Verificar: health, chain validation, storage integrity
5. Documentar incidente (rule 174)
