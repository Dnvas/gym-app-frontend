import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  StyleSheet,
  View,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { Session } from '@supabase/supabase-js'
import { FlashList } from '@shopify/flash-list'

import Avatar from './Avatar'

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [users, setUsers] = useState<{ id: string }[]>([])

  useEffect(() => {
    if (session) getProfile()
    if (session) getAllUsers()
  }, [session])

  async function getAllUsers() {
    const { data, error } = await supabase.from('profiles').select('id')
    if (error) console.log(error.message)
    setUsers(data ?? [])
  }

  async function getProfile() {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', session?.user.id)
        .single()
      if (error && status !== 406) {
        throw error
      }

      if (data) {
        setUsername(data.username)
        setWebsite(data.website)
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile({
    username,
    website,
    avatar_url,
  }: {
    username: string
    website: string
    avatar_url: string
  }) {
    try {
      setLoading(true)
      if (!session?.user) throw new Error('No user on the session!')

      const updates = {
        id: session?.user.id,
        username,
        website,
        avatar_url,
        updated_at: new Date(),
      }

      const { error } = await supabase.from('profiles').upsert(updates)

      if (error) {
        throw error
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View>
        <Avatar
          size={200}
          url={avatarUrl}
          onUpload={(url: string) => {
            setAvatarUrl(url)
            updateProfile({ username, website, avatar_url: url })
          }}
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={session?.user?.email}
          editable={false}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username || ''}
          onChangeText={(text: string) => setUsername(text)}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Text style={styles.label}>Website</Text>
        <TextInput
          style={styles.input}
          value={website || ''}
          onChangeText={(text: string) => setWebsite(text)}
        />
      </View>

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          disabled={loading}
          onPress={() =>
            updateProfile({ username, website, avatar_url: avatarUrl })
          }
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Update</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.verticallySpaced}>
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={() => supabase.auth.signOut()}
        >
          <Text style={styles.buttonSecondaryText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.verticallySpaced, { height: 200 }]}>
        <FlashList
          data={users}
          renderItem={({ item }) => <Text>{item.id}</Text>}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  button: {
    backgroundColor: '#2089dc',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2089dc',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#2089dc',
    fontSize: 16,
    fontWeight: '600',
  },
})