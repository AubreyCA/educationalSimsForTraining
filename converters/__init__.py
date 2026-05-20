from .flash_adc import FlashADC
from .sar_adc import SARADC
from .sigma_delta_adc import SigmaDeltaADC
from .pipeline_adc import PipelineADC
from .r2r_dac import R2RDAC
from .current_dac import CurrentDAC

CONVERTERS = {
    'flash_adc': FlashADC,
    'sar_adc': SARADC,
    'sigma_delta_adc': SigmaDeltaADC,
    'pipeline_adc': PipelineADC,
    'r2r_dac': R2RDAC,
    'current_dac': CurrentDAC,
}
