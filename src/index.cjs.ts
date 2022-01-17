import createAuthokClient, {
  AuthokClient,
  GenericError,
  AuthenticationError,
  TimeoutError,
  PopupTimeoutError,
  MfaRequiredError
} from './index';

/**
 * @ignore
 */
const wrapper = createAuthokClient as any;

wrapper.AuthokClient = AuthokClient;
wrapper.createAuthokClient = createAuthokClient;
wrapper.GenericError = GenericError;
wrapper.AuthenticationError = AuthenticationError;
wrapper.TimeoutError = TimeoutError;
wrapper.PopupTimeoutError = PopupTimeoutError;
wrapper.MfaRequiredError = MfaRequiredError;

export default wrapper;
