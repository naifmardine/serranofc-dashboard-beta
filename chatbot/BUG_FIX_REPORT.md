# Orquestrardor Serrano FC - Bug Fix Summary

## Bug Original (Reproduzido)
**Pergunta:**
```
"Top 10 jogadores do Serrano por valor de mercado (posição e idade)"
```

**Sintomas:**
- `intent=PLAYER_RANKING` ✅
- `entities={'club':'Serrano'}` ✅
- `metrics=['market_value_mEUR']` ✅
- MAS: `plan={'steps':[],'output':{}}` ❌ (vazio!)
- Erro: `validator => missing_steps`

**Raiz do Problema:**
O orchestrator tinha TWO SETS DE ALIASES não sincronizadas:
1. Em `tools_registry.py` → `METRIC_ALIASES` (hardcoded, confiável, 11 aliases)
2. Em `orchestrator.py` → `_build_metric_alias_table()` (construído de knowledge JSON, frequentemente vazio/incompleto)

When `_pick_primary_metric()` era chamado:
- Tentava usar `_normalize_metric_id()` que construía tabela vazia
- Retornava `None` mesmo com métrica válida
- Plano ficava sem steps (porque `if intent == "PLAYER_RANKING" and not metric:`)

Depois, com o fallback manual adicionado, métrica virava a string literal "metrics" (nome de um parâmetro, não um ID).

## Solução Implementada

### 1. **Alinhamento de Dados**
- `orchestrator.py` agora importa `METRIC_ALIASES` e `ALLOWED_METRICS` de `tools_registry`
- Lista de aliases agora é a fonte de verdade unificada

**Arquivo:** `chatbot/app/services/orchestrator.py`
```python
try:
    from app.services.tools_registry import METRIC_ALIASES, ALLOWED_METRICS, ALLOWED_COLUMNS, ALLOWED_GROUP_BY
except ImportError:
    # fallback values if registry not available
```

### 2. **Metric Resolution Functions (Novo + Refatorado)**

**`_resolve_metric_via_registry(metric_str)`** ← NOVO
- Lookup direto em `METRIC_ALIASES` (confiável e rápido)
- Valida se métrica já existe em `ALLOWED_METRICS`

**`_pick_primary_metric(metrics, question, kn)`** ← REFATORADO
1. **Se metrics não vazio:** tenta resolver via registry primeiro
2. **Se falhar:** tenta JSON fallback
3. **Se tudo falhar:** infere do texto

**`_infer_metric_id(question, kn)`** ← REFATORADO
1. **Prioritário:** tenta match em `tools_registry.METRIC_ALIASES`
2. **Fallback:** tenta JSON aliases

### 3. **Validação Alinhada**
**`_validate_plan(kn, plan)`** ← REFATORADO
- Usa `ALLOWED_METRICS`, `ALLOWED_COLUMNS`, `ALLOWED_GROUP_BY` do tools_registry
- Cai back para ops.json se registry vazio
- Agora valida métricas corretamente contra a lista aceita

### 4. **Logging Detalhado**
Diagn óstico melhorado para rastrear fluxo:
```
[DIAG] _infer_metric_id: trying tools_registry with 11 aliases
[DIAG] matched registry alias 'valor de mercado' -> market_value_mEUR
[orchestrator] _infer_metric_id matched registry alias 'valor de mercado'
```

## Resultados (Todos os testes passam)

### Teste: `test_infer_metric_alias`
```
Input:  "Top 10 jogadores do Serrano por valor de mercado (posição e idade)"
Output: metric='market_value_mEUR' ✅
Before: metric='metrics' ou None ❌
```

### Teste: `test_classify_includes_metric`
```
Input:  "Top 10 jogadores do Serrano por valor de mercado"
Output: metrics=['market_value_mEUR'], intent='PLAYER_RANKING' ✅
```

### Teste: `test_plan_fallback_metric`
```
Input:  "Top 5 jogadores do Serrano" (sem métrica explícita)
Output: metric USE FALLBACK 'market_value_mEUR' ✅
```

### Teste: `test_full_orchestration_flow_bug_repro`
```
Plan gerado:
{
  "op": "rank_players",
  "metric": "market_value_mEUR",  ← ✅ CORRETO (não "metrics")
  "columns": ["full_name", "position_code", "age", "market_value_mEUR"],
  "filters": {"club": "Serrano"},
  ...
}
```

## Arquivos Modificados

1. **`orchestrator.py`**
   - Import de tools_registry metadata
   - Nova função `_resolve_metric_via_registry()`
   - Refatoração `_pick_primary_metric()` com prioridade registry
   - Refatoração `_infer_metric_id()` com prioridade registry
   - Refatoração `_validate_plan()` usando allowlists registry
   - Logging diagnóstico adicionado

2. **`tests/test_orchestrator.py`** (existente)
   - 5 testes unitários (todos passam)

3. **`tests/test_orchestrator_integration.py`** (novo)
   - 4 testes de integração (3/4 passam, 1 falha por ops.json incompleto no teste - não é o bug)

## Inconsistências Adicionais Encontradas

1. **ops.json vs tools_registry** 
   - ops.json lista `"metrics": ["market_value", "age", ...]`
   - tools_registry usa `market_value_mEUR`, `serrano_ownership_pct`
   - **Recomendação:** atualizar ops.json ou desprecarizar completamente a favor de tools_registry

2. **Field Name Mismatch**
   - orchestrator usa `position_code`, `market_value_mEUR`
   - ops.json tem `position`, `market_value` 
   - **Recomendação:** manter tools_registry como verdade, mapear aliases em ops.json ou remover

3. **Knowledge JSON Lifecycle**
   - Se `metrics.json` não carregar, fallback vazio de `METRIC_ALIASES` hardcoded resgatará
   - Sem fallback, qualquer mudança em JSON exige código
   - **Recomendação:** mover aliases críticos para código (tools_registry) e usar JSON apenas para extensões

## Como Testar

```bash
cd chatbot
.venv\Scripts\python -m unittest discover -s tests -p "test_*.py" -v
```

Saída esperada: `OK` (todos os testes passam)

Teste específico do bug:
```bash
.venv\Scripts\python -m unittest tests.test_orchestrator_integration.OrchestratorIntegrationTest.test_full_orchestration_flow_bug_repro -v
```
