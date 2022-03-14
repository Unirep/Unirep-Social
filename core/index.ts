import {  
    deployUnirepSocial,
    UnirepSocialFacory,
    UnirepSocial, 
} from "./utils";
import { 
    defaultAirdroppedReputation, 
    defaultPostReputation, 
    defaultCommentReputation, 
    maxReputationBudget, 
} from "../config/socialMedia"
import {
    identityPrefix,
    identityCommitmentPrefix,
    epkProofPrefix,
    epkPublicSignalsPrefix,
    reputationProofPrefix,
    reputationPublicSignalsPrefix,
    signUpProofPrefix,
    signUpPublicSignalsPrefix,
} from "../cli/prefix"

export {
    UnirepSocialFacory,
    UnirepSocial, 
    deployUnirepSocial,
    defaultAirdroppedReputation, 
    defaultPostReputation, 
    defaultCommentReputation, 
    maxReputationBudget,
    identityPrefix,
    identityCommitmentPrefix,
    epkProofPrefix,
    epkPublicSignalsPrefix,
    reputationProofPrefix,
    reputationPublicSignalsPrefix,
    signUpProofPrefix,
    signUpPublicSignalsPrefix,
}