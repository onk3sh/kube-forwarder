<template>
  <BaseForm multicolumn class="service-form" @submit="handleSubmit">
    <fieldset>
      <ControlGroup label="Cluster Name" size="2" :attribute="$v.attributes.clusterId">
        <BaseSelect v-model="$v.attributes.clusterId.$model" :options="clusterOptions" />
      </ControlGroup>

      <ControlGroup label="Namespace" size="2" :attribute="$v.attributes.namespace">
        <AutocompleteInput v-model="$v.attributes.namespace.$model"
                           :options="namespaces.data"
                           :loading="namespaces.loading"
                           @focus="handleNamespaceFocus" />
      </ControlGroup>

      <ControlGroup label="Kind" size="2" :attribute="$v.attributes.workloadType">
        <BaseSelect
          v-model="$v.attributes.workloadType.$model"
          :options="workloadTypeOptions"
          placeholder="Select Workload Type"
        />
      </ControlGroup>

      <ControlGroup
        label="Name"
        size="2"
        :attribute="$v.attributes.workloadName"
        :disabled="!attributes.workloadType"
      >
        <template v-slot="slotProps">
          <AutocompleteInput v-model="slotProps.attribute.$model"
                             v-bind="slotProps"
                             :options="resources.data"
                             :loading="resources.loading"
                             @focus="handleResourceNameFocus" />
        </template>
      </ControlGroup>

      <ControlGroup label="Alias" size="2" :attribute="$v.attributes.alias">
        <BaseInput v-model="$v.attributes.alias.$model" placeholder="Optional..." />
      </ControlGroup>

      <ControlGroup label="Ports Forwarding">
        <ForwardsTable v-model="attributes.forwards" :attribute="$v.attributes.forwards" />
      </ControlGroup>

      <ControlGroup label="">
        <BaseCheckbox :value="attributes.localAddress != null"
                      @input="toggleCustomLocalAddress"
        >
          Use custom local address
        </BaseCheckbox>
      </ControlGroup>

      <ControlGroup v-if="attributes.localAddress != null" label="">
        <BaseInput v-model="$v.attributes.localAddress.$model"
                   placeholder="localhost"
        />
      </ControlGroup>
    </fieldset>

    <div class="control-actions">
      <Button theme="danger" layout="outline" :to="backPath">Cancel</Button>
      <div class="space" />
      <div class="control-actions__error">{{ error }}</div>
      <Button type="submit" theme="primary" :disabled="$v.$invalid">{{ submitButtonTitle }}</Button>
    </div>
  </BaseForm>
</template>

<script>
import cloneDeep from 'clone-deep'
import { mapActions } from 'vuex'
import { required, minLength, integer, between } from 'vuelidate/lib/validators'
import { validationMixin } from 'vuelidate'

import * as resourceKinds from '../../../lib/constants/workload-types'

import BaseCheckbox from '../form/BaseCheckbox'
import BaseForm from '../form/BaseForm'
import BaseInput from '../form/BaseInput'
import BaseSelect from '../form/BaseSelect'
import Button from '../Button'
import ForwardsTable from './ForwardsTable'
import ControlGroup from '../form/ControlGroup'
import AutocompleteInput from '../form/AutocompleteInput'

export default {
  components: {
    AutocompleteInput,
    BaseCheckbox,
    ControlGroup,
    BaseInput,
    BaseForm,
    Button,
    BaseSelect,
    ForwardsTable
  },
  mixins: [validationMixin],
  props: {
    serviceId: { type: String, default: null },
    initialAttributes: { type: Object, default: () => ({}) }
  },
  validations: {
    attributes: {
      clusterId: { required },
      alias: {},
      namespace: { required },
      workloadType: {
        required,
        oneOf: (value) => Object.values(resourceKinds).includes(value)
      },
      workloadName: { required },
      forwards: {
        required,
        minLength: minLength(1),
        $each: {
          localPort: { required, integer, between: between(0, 65535) },
          remotePort: { required, integer, between: between(0, 65535) }
        }
      },
      localAddress: {}
    }
  },
  data() {
    return {
      error: null,
      attributes: {
        ...this.getEmptyAttributes(),
        clusterId: this.$route.params.clusterId,
        ...cloneDeep(this.initialAttributes)
      },
      namespaces: {
        data: [],
        loading: false,
        clusterId: null
      },
      resources: {
        data: [],
        loading: false,
        cacheKey: null
      }
    }
  },
  computed: {
    clusterOptions() {
      return Object.values(this.$store.state.Clusters.items).map(x => [x.id, x.name])
    },
    workloadTypeOptions() {
      return [
        [resourceKinds.POD, 'Pod'],
        [resourceKinds.DEPLOYMENT, 'Deployment'],
        [resourceKinds.SERVICE, 'Service']
      ]
    },
    submitButtonTitle() {
      return this.serviceId ? `Save` : 'Add a resource'
    },
    backPath() {
      return '/'
    },
    cluster() {
      return this.$store.state.Clusters.items[this.attributes.clusterId]
    },
    resourcesCacheKey() {
      const { clusterId, namespace, workloadType } = this.attributes
      return `${clusterId}:${namespace}:${workloadType}`
    }
  },
  methods: {
    ...mapActions('Services', ['createService']),
    getEmptyAttributes() {
      return {
        clusterId: null,
        name: '',
        namespace: '',
        workloadType: null,
        workloadName: '',
        forwards: [],
        localAddress: null
      }
    },
    async handleNamespaceFocus() {
      if (this.cluster && this.namespaces.clusterId !== this.attributes.clusterId) {
        this.namespaces.loading = true

        try {
          this.namespaces.data = await window.api.resources.namespaces(this.cluster.config)
          this.namespaces.clusterId = this.cluster.id
        } catch (e) {
          console.error(e)
        }

        this.namespaces.loading = false
      }
    },
    async handleResourceNameFocus() {
      if (this.cluster && this.resources.cacheKey !== this.resourcesCacheKey) {
        this.resources.loading = true

        try {
          this.resources.data = await window.api.resources.list(
            this.cluster.config,
            this.attributes.workloadType,
            this.attributes.namespace
          )
          this.resources.cacheKey = this.resourcesCacheKey
        } catch (e) {
          console.error(e)
        }

        this.resources.loading = false
      }
    },
    handleSubmit() {
      const action = this.serviceId ? 'Services/updateService' : 'Services/createService'

      this.$store.dispatch(action, { ...this.attributes }).then(result => {
        if (result.success) {
          this.$router.push('/')
        } else {
          this.error = JSON.stringify(result.errors)
        }
      })
    },
    toggleCustomLocalAddress() {
      this.attributes.localAddress = this.attributes.localAddress == null ? '' : null
    }
  }
}
</script>

<style scoped lang="scss">
.service-form {
  .base-form {
    display: flex;
    flex-direction: column;
  }
}
</style>
